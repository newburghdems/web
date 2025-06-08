import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { BskyAgent, RichText, AtUri } from '@atproto/api';
const formatTimeAgo = date => {
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
        const agent = new BskyAgent({
          service: 'https://public.api.bsky.app'
        });
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
    return /*#__PURE__*/React.createElement("div", {
      className: "max-w-6xl mx-auto"
    }, /*#__PURE__*/React.createElement("div", {
      className: "px-6"
    }, /*#__PURE__*/React.createElement("div", {
      className: "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6"
    }, [...Array(4)].map((_, i) =>
    /*#__PURE__*/
    // Skeleton for 4 posts
    React.createElement("div", {
      key: i,
      className: "bg-white p-4 rounded-lg shadow-md h-full"
    }, " ", /*#__PURE__*/React.createElement("div", {
      className: "animate-pulse"
    }, /*#__PURE__*/React.createElement("div", {
      className: "w-full h-48 bg-gray-300 rounded mb-3"
    }), " ", /*#__PURE__*/React.createElement("div", {
      className: "h-3 bg-gray-300 rounded w-1/4"
    }), " "))))));
  }
  if (error) {
    return /*#__PURE__*/React.createElement("div", {
      className: "max-w-6xl mx-auto"
    }, /*#__PURE__*/React.createElement("div", {
      className: "px-6"
    }, /*#__PURE__*/React.createElement("p", {
      className: "text-center text-red-500"
    }, translations.error_loading || 'Could not load updates. Please try again later.'), /*#__PURE__*/React.createElement("p", {
      className: "text-center text-gray-500"
    }, error)));
  }
  if (posts.length === 0) {
    return /*#__PURE__*/React.createElement("div", {
      className: "max-w-6xl mx-auto"
    }, /*#__PURE__*/React.createElement("div", {
      className: "px-6"
    }, /*#__PURE__*/React.createElement("p", {
      className: "text-center text-gray-600"
    }, translations.no_posts || 'No image posts found at the moment.')));
  }
  return /*#__PURE__*/React.createElement("div", {
    className: "max-w-6xl mx-auto"
  }, /*#__PURE__*/React.createElement("div", {
    className: "px-6"
  }, /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6"
  }, posts.map((post, index) => /*#__PURE__*/React.createElement("a", {
    key: index // [cite: 313]
    ,
    href: post.uri,
    target: "_blank",
    rel: "noopener noreferrer",
    className: "block group"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 h-full"
  }, post.imageUrl && /*#__PURE__*/React.createElement("img", {
    src: post.imageUrl,
    alt: post.altText,
    className: "w-full object-cover group-hover:opacity-90 transition-opacity"
  }), /*#__PURE__*/React.createElement("div", {
    className: "p-3"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-gray-500"
  }, new Date(post.createdAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })))))))));
};
export default BlueskyUpdates;
//# sourceMappingURL=BlueskyUpdates.js.map