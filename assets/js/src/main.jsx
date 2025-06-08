import React from 'react';
import { createRoot } from 'react-dom/client';
import BlueskyUpdates from './components/BlueskyUpdates.js';
import UpcomingEvents from './components/UpcomingEvents.js';
import NextCommitteeMeeting from './components/NextCommitteeMeeting.js';

window.siteTranslations = {};
if (window.site_translations) {
  window.siteTranslations = window.site_translations;
}

// Initialize React components when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  const blueskyFeedContainer = document.getElementById('bluesky-updates');
  if (blueskyFeedContainer) {
    const root = createRoot(blueskyFeedContainer);
    root.render(React.createElement(BlueskyUpdates));
  }

  const nextCommitteeMeetingContainer = document.getElementById('next-committee-meeting-react');
  if (nextCommitteeMeetingContainer) {
    const calendarUrl = nextCommitteeMeetingContainer.dataset.calendarUrl;
    const root = createRoot(nextCommitteeMeetingContainer);
    root.render(React.createElement(NextCommitteeMeeting, { calendarUrl: calendarUrl }));
  }

  const upcomingEventsContainer = document.getElementById('upcoming-events-react');
  if (upcomingEventsContainer) {
    const calendarUrl = upcomingEventsContainer.dataset.calendarUrl;
    const root = createRoot(upcomingEventsContainer);
    root.render(React.createElement(UpcomingEvents, { calendarUrl: calendarUrl }));
  }
});

