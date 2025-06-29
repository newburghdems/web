import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { BskyAgent, RichText, AtUri } from '@atproto/api';

const formatTimeAgo = (date) => {
  const seconds = Math.floor((new Date() - new Date(date)) / 1000);
  const intervals = {
    year: 31536000,
    month: 2592000,
    week: 604800,
    day: 86400,
    hour: 3600,
    minute: 60
  };

  for (const [unit, secondsInUnit] of Object.entries(intervals)) {
    const interval = Math.floor(seconds / secondsInUnit);
    if (interval >= 1) {
      return `${interval} ${unit}${interval !== 1 ? 's' : ''} ago`;
    }
  }
  return 'just now';
};

function getBskyPostUrl(postUri) {
  try {
    const atUri = new AtUri(postUri);
    if (atUri.collection === 'app.bsky.feed.post') {
      const did = atUri.host;
      const rkey = atUri.rkey;
      return `https://bsky.app/profile/${did}/post/${rkey}`;
    } else {
      return null; // Not a post URI
    }
  } catch (error) {
    console.error('Error parsing URI:', error);
    return null; // Invalid URI
  }
}

const BlueskyUpdates = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [translations, setTranslations] = useState({});
  const [lang, setLang] = useState('en');

  // Load translations based on the current language
  useEffect(() => {
    // Get the language from the data attribute
    const container = document.getElementById('bluesky-updates');
    const pageLang = container?.dataset?.lang || 'en';
    setLang(pageLang);

    if (window.siteTranslations && window.siteTranslations[pageLang]) {
      setTranslations(window.siteTranslations[pageLang].home.bluesky_updates);
    }
  }, []);

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const agent = new BskyAgent({ service: 'https://public.api.bsky.app' });

        const response = await agent.api.app.bsky.feed.getAuthorFeed({
          actor: 'newburghdems.org',
          limit: 4
        });


        const formattedPosts = response.data.feed.map(item => {
          let imageUrl = null;
          let altText = 'Bluesky post image'; // Default alt text

          // Check for image embed
          if (item.post.embed && item.post.embed.images && item.post.embed.images.length > 0) {
            imageUrl = item.post.embed.images[0].fullsize; // Or .thumb if preferred for previews
            altText = item.post.embed.images[0].alt || altText;
          }

          // We only want to display posts that have an image
          if (imageUrl) {
            return {
              uri: getBskyPostUrl(item.post.uri),
              imageUrl: imageUrl,
              altText: altText,
              createdAt: item.post.record.createdAt // [cite: 304]
            };
          }
          return null; // If no image, this post will be filtered out
        }).filter(post => post !== null);

        setPosts(formattedPosts);
        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    };

    fetchPosts();
  }, []);

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="px-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => ( // Skeleton for 4 posts
              <div key={i} className="bg-white p-4 rounded-lg shadow-md h-full"> {/* [cite: 306] */}
                <div className="animate-pulse">
                  <div className="w-full h-48 bg-gray-300 rounded mb-3"></div> {/* Image placeholder */}
                  <div className="h-3 bg-gray-300 rounded w-1/4"></div> {/* Date placeholder */}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="px-6">
          <p className="text-center text-red-500">{translations.error_loading || 'Could not load updates. Please try again later.'}</p>
          <p className="text-center text-gray-500">{error}</p>
        </div>
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="px-6">
          <p className="text-center text-gray-600">{translations.no_posts || 'No image posts found at the moment.'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="px-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
          {posts.map((post, index) => (
            <a
              key={index}
              href={post.uri}
              target="_blank"
              rel="noopener noreferrer"
              className="block group"
            >
              <div className="bg-light-gray rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 h-full flex flex-col overflow-hidden">
                <div className="flex-grow flex items-center justify-center">
                  {post.imageUrl && (
                    <img
                      src={post.imageUrl}
                      alt={post.altText}
                      className="w-full h-auto max-h-full object-contain group-hover:opacity-90 transition-opacity"
                    />
                  )}
                </div>
                <div className="p-3 mt-auto">
                  <p className="text-xs text-gray-500 font-semibold">
                    {new Date(post.createdAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </p>
                </div>
              </div>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
};

export default BlueskyUpdates;
