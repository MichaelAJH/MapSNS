import { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import type { Post } from '../lib/supabase';
import CreatePost from '../components/CreatePost';
import Comments from '../components/Comments';

export default function MapRoute() {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<any>(null);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [isCreatingPost, setIsCreatingPost] = useState(false);
  const markersRef = useRef<any[]>([]);
  const detailsRef = useRef<HTMLDivElement>(null);
  const [activePopup, setActivePopup] = useState<{ marker: any; popup: any } | null>(null);
  const [mapHeight, setMapHeight] = useState('100%');
  const [mapTop, setMapTop] = useState('0');
  const [mapCenter, setMapCenter] = useState<[number, number] | null>(null);
  const [mapZoom, setMapZoom] = useState<number | null>(null);

  useEffect(() => {
    let leafletMap: any;
    let L: any;
    let leafletCSS: HTMLLinkElement | null = null;

    async function loadLeaflet() {
      // Dynamically import Leaflet and CSS
      L = (await import('leaflet')).default;
      await import('leaflet/dist/leaflet.css');

      // Fix for default marker icons in Leaflet with Next.js
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
      });

      if (!mapRef.current) return;
      leafletMap = L.map(mapRef.current).setView([37.5665, 126.978], 12); // Default to Seoul
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
      }).addTo(leafletMap);

      // Get user's location
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setUserLocation([longitude, latitude]);
          leafletMap.setView([latitude, longitude], 14);
          fetchNearbyPosts(longitude, latitude, leafletMap, L);
        },
        (error) => {
          console.error('Error getting location:', error);
        }
      );

      setMap(leafletMap);
    }

    loadLeaflet();

    return () => {
      if (leafletMap) leafletMap.remove();
      if (leafletCSS && document.head.contains(leafletCSS)) document.head.removeChild(leafletCSS);
    };
    // eslint-disable-next-line
  }, []);

  // minimize the post details when clicking outside
  useEffect(() => {
    const handleClickOutside = async (event: MouseEvent) => {
      if (detailsRef.current && !detailsRef.current.contains(event.target as Node)) {
        // If there's a selected post, update its view count before closing
        if (selectedPost) {
          await incrementViews(selectedPost.id);
        }
        setSelectedPost(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [selectedPost]);

  // Add effect to handle map resizing when post is selected
  useEffect(() => {
    if (!map) return;

    if (selectedPost) {
      // Store current map state before resizing
      const currentCenter = map.getCenter();
      const currentZoom = map.getZoom();
      setMapCenter([currentCenter.lat, currentCenter.lng]);
      setMapZoom(currentZoom);

      // Resize map to half height
      setMapHeight('50%');
      setMapTop('0');

      // After resize, adjust the view to show the middle portion
      setTimeout(() => {
        map.invalidateSize();
        // Calculate the new center to show the middle portion
        const bounds = map.getBounds();
        const latDiff = bounds.getNorth() - bounds.getSouth();
        const newCenter = [
          bounds.getSouth() + (latDiff * 0.5), // Center vertically
          currentCenter.lng
        ];
        map.setView(newCenter, currentZoom);
      }, 100);
    } else {
      // Restore map to full height
      setMapHeight('100%');
      setMapTop('0');

      // After resize, restore the previous view
      setTimeout(() => {
        map.invalidateSize();
        if (mapCenter && mapZoom) {
          map.setView(mapCenter, mapZoom);
        }
      }, 100);
    }
  }, [selectedPost, map]);

  const fetchNearbyPosts = async (longitude: number, latitude: number, leafletMap: any, L: any) => {
    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .order('views', { ascending: false })
      .limit(15);

    if (error) {
      console.error('Error fetching posts:', error);
      return;
    }

    setPosts(data || []);
    addMarkersToMap(data || [], leafletMap, L);
  };

  const addMarkersToMap = (posts: Post[], leafletMap: any, L: any) => {
    if (!leafletMap) return;
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    // Group posts by location (using a small threshold for "same location")
    const locationGroups = new Map<string, Post[]>();
    const LOCATION_THRESHOLD = 0.0001; // approximately 11 meters

    // First, group the posts
    posts.forEach((post) => {
      const key = `${Math.round(post.latitude / LOCATION_THRESHOLD)},${Math.round(post.longitude / LOCATION_THRESHOLD)}`;
      if (!locationGroups.has(key)) {
        locationGroups.set(key, []);
      }
      locationGroups.get(key)?.push(post);
    });

    // Sort posts within each group by views (descending) and then by creation date (descending)
    locationGroups.forEach((groupPosts) => {
      groupPosts.sort((a, b) => {
        if (b.views !== a.views) {
          return b.views - a.views;
        }
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
    });

    // Create markers for each location group
    locationGroups.forEach((groupPosts, key) => {
      // Calculate average position for the group
      const avgLat = groupPosts.reduce((sum, post) => sum + post.latitude, 0) / groupPosts.length;
      const avgLng = groupPosts.reduce((sum, post) => sum + post.longitude, 0) / groupPosts.length;
      
      const totalViews = groupPosts.reduce((sum, post) => sum + post.views, 0);
      
      const markerIcon = L.divIcon({
        className: 'custom-marker',
        html: `<div style="
          width: 30px;
          height: 30px;
          border-radius: 50%;
          background-color: rgb(255, ${255 - Math.min(totalViews * 2, 255)}, 0);
          border: 2px solid white;
          cursor: pointer;
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          color: white;
          text-shadow: 1px 1px 2px rgba(0,0,0,0.5);
        ">
          ${groupPosts.length}
        </div>`,
        iconSize: [30, 30],
        iconAnchor: [15, 15]
      });

      const marker = L.marker([avgLat, avgLng], { icon: markerIcon })
        .addTo(leafletMap);

      const popupContent = `
        <div style="width: 200px; max-height: 300px; overflow-y: auto;" class="popup-content">
          ${groupPosts.length === 1 ? `
            <div style="
              padding: 8px;
              cursor: pointer;
            " class="post-preview" data-post-id="${groupPosts[0].id}">
              <p style="
                margin: 0;
                font-size: 14px;
                color: #333;
                display: -webkit-box;
                -webkit-line-clamp: 2;
                -webkit-box-orient: vertical;
                overflow: hidden;
              ">${groupPosts[0].text}</p>
              <p style="
                margin: 4px 0 0;
                font-size: 12px;
                color: #666;
              ">Views: ${groupPosts[0].views}</p>
            </div>
          ` : groupPosts.slice(0, 4).map(post => `
            <div style="
              padding: 8px;
              border-bottom: 1px solid #eee;
              cursor: pointer;
            " class="post-preview" data-post-id="${post.id}">
              <p style="
                margin: 0;
                font-size: 14px;
                color: #333;
                display: -webkit-box;
                -webkit-line-clamp: 2;
                -webkit-box-orient: vertical;
                overflow: hidden;
              ">${post.text}</p>
              <p style="
                margin: 4px 0 0;
                font-size: 12px;
                color: #666;
              ">Views: ${post.views}</p>
            </div>
          `).join('')}
          ${groupPosts.length > 4 ? `
            <div style="
              padding: 8px;
              text-align: center;
              color: #666;
              font-size: 12px;
            ">+${groupPosts.length - 4} more posts</div>
          ` : ''}
        </div>
      `;

      const popup = L.popup({
        closeButton: false,
        offset: L.point(0, -10),
        maxWidth: 200,
        maxHeight: 300,
        className: 'custom-popup'
      })
        .setContent(popupContent);

      // --- Hover logic fix start ---
      let closeTimeout: NodeJS.Timeout | null = null;
      let isOverMarker = false;
      let isOverPopup = false;

      function tryClosePopup() {
        if (!isOverMarker && !isOverPopup) {
          marker.closePopup();
          setActivePopup(null);
        }
      }

      marker.on('mouseover', () => {
        isOverMarker = true;
        if (!activePopup) {
          marker.bindPopup(popup).openPopup();
          setActivePopup({ marker, popup });
        }
        if (closeTimeout) {
          clearTimeout(closeTimeout);
          closeTimeout = null;
        }
      });
      marker.on('mouseout', () => {
        isOverMarker = false;
        closeTimeout = setTimeout(tryClosePopup, 120);
      });

      popup.on('add', () => {
        // Add listeners to popup DOM
        setTimeout(() => {
          const popupElement = document.querySelector('.custom-popup');
          if (popupElement) {
            popupElement.addEventListener('mouseenter', () => {
              isOverPopup = true;
              if (closeTimeout) {
                clearTimeout(closeTimeout);
                closeTimeout = null;
              }
            });
            popupElement.addEventListener('mouseleave', () => {
              isOverPopup = false;
              closeTimeout = setTimeout(tryClosePopup, 120);
            });
            // Add click handler for post previews
            popupElement.addEventListener('mousedown', (e) => {
              const target = (e.target as HTMLElement).closest('.post-preview');
              if (target) {
                const postId = target.getAttribute('data-post-id');
                const post = groupPosts.find(p => p.id === postId);
                if (post) {
                  setSelectedPost(post);
                  incrementViews(post.id);
                  //marker.closePopup();
                  //setActivePopup(null);
                }
              }
            });
          }
        }, 0);
      });
      popup.on('remove', () => {
        setActivePopup(null);
        isOverPopup = false;
        if (closeTimeout) {
          clearTimeout(closeTimeout);
          closeTimeout = null;
        }
      });
      // --- Hover logic fix end ---

      // Handle click for detailed view
      marker.on('click', (e: any) => {
        // If the click is on a post preview, show that post
        const target = e.originalEvent.target.closest('.post-preview');
        if (target) {
          const postId = target.dataset.postId;
          const post = groupPosts.find(p => p.id === postId);
          if (post) {
            setSelectedPost(post);
            incrementViews(post.id);
          }
        } else {
          // If clicking the marker itself, show the most viewed post
          setSelectedPost(groupPosts[0]);
          incrementViews(groupPosts[0].id);
        }
      });

      markersRef.current.push(marker);
    });
  };

  const incrementViews = async (postId: string) => {
    const post = posts.find(p => p.id === postId);
    if (!post) return;

    try {
      const { data, error } = await supabase
        .from('posts')
        .update({ views: post.views + 1 })
        .eq('id', postId)
        .select()
        .single();

      if (error) {
        console.error('Error incrementing views:', error);
        return;
      }

      if (data) {
        // Update the local state immediately
        setPosts(posts.map(p => 
          p.id === postId ? { ...p, views: data.views } : p
        ));
        
        // Update the selected post if it's the one being viewed
        if (selectedPost?.id === postId) {
          setSelectedPost({ ...selectedPost, views: data.views });
        }
      }
    } catch (error) {
      console.error('Error in incrementViews:', error);
    }
  };

  return (
    <div className="relative w-full h-screen">
      <div 
        ref={mapRef} 
        className="w-full transition-all duration-300 ease-in-out" 
        style={{ 
          height: mapHeight,
          top: mapTop,
          position: 'relative'
        }} 
      />
      <button
        style={{ zIndex: 1000 }}
        onClick={() => setIsCreatingPost(true)}
        className="absolute top-4 right-4 bg-blue-500 text-white px-4 py-2 rounded shadow-lg"
      >
        Create Post
      </button>
      {isCreatingPost && userLocation && (
        <div className="absolute top-4 left-4 right-4 max-w-md mx-auto" style={{ zIndex: 1100 }}>
          <CreatePost
            latitude={userLocation[1]}
            longitude={userLocation[0]}
            onPostCreated={() => {
              setIsCreatingPost(false);
              if (userLocation && map) {
                fetchNearbyPosts(userLocation[0], userLocation[1], map, (window as any).L || null);
              }
            }}
          />
        </div>
      )}
      {selectedPost && (
        <div 
          ref={detailsRef}
          className="absolute bottom-0 left-0 right-0 bg-white p-4 rounded-t-lg shadow-lg max-h-[50vh] overflow-y-auto" 
          style={{ zIndex: 1200 }}
        >
          <button
            onClick={() => setSelectedPost(null)}
            className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
          <div className="pr-8">
            <img src={selectedPost.image_url} alt="Post" className="w-full h-48 object-cover rounded" />
            <p className="mt-2 text-gray-900">{selectedPost.text}</p>
            <p className="text-sm text-gray-500">Views: {selectedPost.views}</p>
            <Comments postId={selectedPost.id} />
          </div>
        </div>
      )}
    </div>
  );
} 