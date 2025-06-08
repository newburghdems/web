import React, { useState, useEffect } from 'react';
import { Loader2, CalendarHeart, Calendar, Clock, MapPin } from 'lucide-react';
import ical from 'ical';
const NextCommitteeMeeting = ({
  calendarUrl
}) => {
  const [lang, setLang] = useState('en');
  const [translations, setTranslations] = useState({});
  const [committeeMeeting, setCommitteeMeeting] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Helper function to get the locale string
  const locale = () => {
    return `${lang}-US`;
  };

  // Helper function to format the date
  const formatDate = (startDate, endDate) => {
    const options = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    };
    let dateString = startDate.toLocaleDateString(locale(), options);

    // Check if it's a multi-day event or if the end date is on a different day
    if (isMultiDay(startDate, endDate) || !isSameDay(startDate, endDate)) {
      const endOptions = {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      };
      dateString += ` - ${new Date(endDate).toLocaleDateString(locale(), endOptions)}`;
    }
    return dateString;
  };

  // Helper function to format the time
  const formatTime = (startDate, endDate, isAllDay) => {
    if (isAllDay) return translations.all_day || 'All Day'; // Use translation for "All Day"
    const options = {
      hour: 'numeric',
      minute: 'numeric',
      hour12: true
    };
    let timeString = startDate.toLocaleTimeString(locale(), options);
    if (endDate && !isSameTime(startDate, endDate)) {
      timeString += ` - ${new Date(endDate).toLocaleTimeString(locale(), options)}`;
    }
    return timeString;
  };

  // Helper function to check if two dates are on the same day
  const isSameDay = (date1, date2) => {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    return d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate();
  };

  // Helper function to check if an event is multi-day
  const isMultiDay = (date1, date2) => {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    // If the event spans more than 24 hours (minus 1ms to handle exact 24h) and ends on a different day
    return d2.getTime() - d1.getTime() > 24 * 60 * 60 * 1000 - 1 && !isSameDay(d1, d2);
  };

  // Helper function to check if two date-times have the same time
  const isSameTime = (date1, date2) => {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    return d1.getHours() === d2.getHours() && d1.getMinutes() === d2.getMinutes();
  };

  // Effect to set language and load translations
  useEffect(() => {
    // Attempt to get the language from the component's container data attribute
    const container = document.getElementById('next-committee-meeting-react');
    const pageLang = container?.dataset?.lang || 'en';
    setLang(pageLang);

    // Load translations from the global window object if available
    if (window.siteTranslations && window.siteTranslations[pageLang] && window.siteTranslations[pageLang].home && window.siteTranslations[pageLang].home.upcoming_events) {
      setTranslations(window.siteTranslations[pageLang].home.upcoming_events);
    } else {
      // Fallback translations if global ones are not found
      setTranslations({
        next_committee_meeting: "Next Committee Meeting",
        next_committee_meeting_description: "Join us for our regular committee meeting. Open to all registered Democrats in the Town of Newburgh. Your participation is vital!",
        date: "Date",
        time: "Time",
        location: "Location",
        loading: "Loading next meeting...",
        could_not_load_meeting: "Could not load meeting information.",
        no_committee_meeting_scheduled: "No committee meeting is currently scheduled. Please check back soon or view the full calendar.",
        all_day: "All Day",
        failed_to_fetch_ics: "Failed to fetch calendar data",
        error_parsing_ics: "Error processing calendar data",
        no_title: "Untitled Event"
      });
    }
  }, []); // Runs once on mount

  // Effect to fetch and process event data
  useEffect(() => {
    if (!calendarUrl) {
      setError(translations.no_calendar_url || "Calendar URL not provided.");
      setLoading(false);
      return;
    }
    if (Object.keys(translations).length === 0) {
      // Don't fetch until translations are loaded
      return;
    }
    const fetchEvents = async () => {
      setLoading(true);
      try {
        const response = await fetch(calendarUrl);
        if (!response.ok) {
          throw new Error(`${translations.failed_to_fetch_ics}: ${response.statusText}`);
        }
        const icsData = await response.text();
        const parsedCal = ical.parseICS(icsData);
        const now = new Date();
        let foundCommitteeMeeting = null;
        const events = [];
        for (const k in parsedCal) {
          if (parsedCal.hasOwnProperty(k)) {
            const event = parsedCal[k];
            if (event.type === 'VEVENT') {
              let startDate = new Date(event.start);
              let endDate = new Date(event.end || event.start);

              // Handle recurring events: find the next occurrence after now
              if (event.rrule) {
                const rrule = event.rrule;
                // Get a limited number of future occurrences to check
                const nextOccurrences = rrule.all((date, i) => i < 20); // Check next 20

                for (const occ of nextOccurrences) {
                  const occStartDate = new Date(occ);
                  if (occStartDate >= now) {
                    // Found the first future occurrence
                    startDate = occStartDate;
                    const duration = new Date(event.end).getTime() - new Date(event.start).getTime();
                    endDate = new Date(startDate.getTime() + duration);
                    break;
                  }
                }
              }

              // Only consider events that are still upcoming or ongoing
              // And ensure startDate is valid and in the future (or current if ongoing)
              if (endDate >= now && startDate && startDate >= new Date(now.getFullYear(), now.getMonth(), now.getDate())) {
                const isAllDayEvent = event.start.length === 8 || event.datetype && event.datetype === 'date';
                events.push({
                  uid: event.uid,
                  title: event.summary || translations.no_title,
                  start: startDate,
                  end: endDate,
                  location: event.location || '',
                  description: event.description || '',
                  isAllDay: isAllDayEvent
                });
              }
            }
          }
        }

        // Sort all potential events by start date
        events.sort((a, b) => a.start - b.start);

        // Find the first event titled "committee meeting"
        for (const event of events) {
          if (event.title.toLowerCase().includes('committee meeting')) {
            foundCommitteeMeeting = event;
            break; // Found the next one
          }
        }
        setCommitteeMeeting(foundCommitteeMeeting);
      } catch (err) {
        console.error(`${translations.error_parsing_ics}:`, err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchEvents();
  }, [calendarUrl, translations]); // Rerun if calendarUrl or translations change

  // Render loading state
  // Render loading state
  if (loading) {
    return /*#__PURE__*/React.createElement("div", {
      className: "rounded-lg shadow-xl overflow-hidden bg-white"
    }, /*#__PURE__*/React.createElement("div", {
      className: "p-6 sm:p-8 animate-pulse"
    }, " ", /*#__PURE__*/React.createElement("div", {
      className: "flex items-center mb-4"
    }, " ", /*#__PURE__*/React.createElement(CalendarHeart, {
      className: "h-7 w-7 sm:h-8 sm:w-8 text-oc-orange-dark mr-3 flex-shrink-0"
    }), /*#__PURE__*/React.createElement("h3", {
      className: "font-merriweather text-xl sm:text-2xl font-bold text-dem-blue-700"
    }, translations.next_committee_meeting)), /*#__PURE__*/React.createElement("p", {
      className: "font-inter text-sm text-gray-700 mb-6 leading-relaxed"
    }, " ", translations.next_committee_meeting_description), /*#__PURE__*/React.createElement("div", {
      className: "space-y-4"
    }, " ", /*#__PURE__*/React.createElement("div", {
      className: "flex items-start space-x-3"
    }, " ", /*#__PURE__*/React.createElement(Calendar, {
      className: "h-5 w-5 text-dem-blue-500 flex-shrink-0 mt-1"
    }), " ", /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
      className: "text-sm text-gray-700"
    }, /*#__PURE__*/React.createElement("strong", {
      className: "font-semibold text-gray-800"
    }, translations.date, ":"), /*#__PURE__*/React.createElement("span", {
      className: "ml-2 inline-block  bg-gray-300 rounded w-40"
    }, "\xA0"), " "))), /*#__PURE__*/React.createElement("div", {
      className: "flex items-start space-x-3"
    }, /*#__PURE__*/React.createElement(Clock, {
      className: "h-5 w-5 text-dem-blue-500 flex-shrink-0 mt-1"
    }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
      className: "text-sm text-gray-700"
    }, /*#__PURE__*/React.createElement("strong", {
      className: "font-semibold text-gray-800"
    }, translations.time, ":"), /*#__PURE__*/React.createElement("span", {
      className: "ml-2 inline-block bg-gray-300 rounded w-32"
    }, "\xA0"), " "))), /*#__PURE__*/React.createElement("div", {
      className: "flex items-start space-x-3"
    }, /*#__PURE__*/React.createElement(MapPin, {
      className: "h-5 w-5 text-dem-blue-500 flex-shrink-0 mt-1"
    }), /*#__PURE__*/React.createElement("div", {
      class: "flex-grow"
    }, /*#__PURE__*/React.createElement("p", {
      className: "w-full text-sm text-gray-700"
    }, /*#__PURE__*/React.createElement("div", {
      className: "font-semibold text-gray-800"
    }, translations.location, ":"), /*#__PURE__*/React.createElement("div", {
      className: "bg-gray-300 rounded w-1/2 mb-1"
    }, "\xA0"), " ", /*#__PURE__*/React.createElement("div", {
      className: "bg-gray-300 rounded w-1/4"
    }, "\xA0"), " "))))));
  }

  // Render error state
  if (error) {
    return /*#__PURE__*/React.createElement("div", {
      className: "rounded-lg shadow-xl overflow-hidden bg-white"
    }, /*#__PURE__*/React.createElement("div", {
      className: "p-6 sm:p-8 text-center"
    }, /*#__PURE__*/React.createElement("p", {
      className: "text-red-600 font-inter"
    }, translations.could_not_load_meeting, ": ", error)));
  }

  // Render "no meeting found" state
  if (!committeeMeeting) {
    return /*#__PURE__*/React.createElement("div", {
      className: "rounded-lg shadow-xl overflow-hidden bg-white"
    }, /*#__PURE__*/React.createElement("div", {
      className: "p-6 sm:p-8"
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex items-center mb-3"
    }, /*#__PURE__*/React.createElement(CalendarHeart, {
      className: "h-7 w-7 sm:h-8 sm:w-8 text-oc-orange-dark mr-3 flex-shrink-0"
    }), /*#__PURE__*/React.createElement("h3", {
      className: "font-merriweather text-xl sm:text-2xl font-bold text-dem-blue-700"
    }, translations.next_committee_meeting)), /*#__PURE__*/React.createElement("p", {
      className: "font-inter text-gray-600"
    }, translations.no_committee_meeting_scheduled)));
  }

  // Render the committee meeting details
  return /*#__PURE__*/React.createElement("div", {
    className: "rounded-lg shadow-xl overflow-hidden bg-white"
  }, /*#__PURE__*/React.createElement("div", {
    className: "p-6 sm:p-8"
  }, " ", /*#__PURE__*/React.createElement("div", {
    className: "flex items-center mb-4"
  }, " ", /*#__PURE__*/React.createElement(CalendarHeart, {
    className: "h-7 w-7 sm:h-8 sm:w-8 text-oc-orange-dark mr-3 flex-shrink-0"
  }), /*#__PURE__*/React.createElement("h3", {
    className: "font-merriweather text-xl sm:text-2xl font-bold text-dem-blue-700"
  }, translations.next_committee_meeting)), /*#__PURE__*/React.createElement("p", {
    className: "font-inter text-sm text-gray-700 mb-6 leading-relaxed"
  }, " ", translations.next_committee_meeting_description), /*#__PURE__*/React.createElement("div", {
    className: "space-y-4"
  }, " ", /*#__PURE__*/React.createElement("div", {
    className: "flex items-start space-x-3"
  }, " ", /*#__PURE__*/React.createElement(Calendar, {
    className: "h-5 w-5 text-dem-blue-500 flex-shrink-0 mt-1"
  }), " ", /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-gray-700"
  }, /*#__PURE__*/React.createElement("strong", {
    className: "font-semibold text-gray-800"
  }, translations.date, ":"), " ", formatDate(committeeMeeting.start, committeeMeeting.end)))), /*#__PURE__*/React.createElement("div", {
    className: "flex items-start space-x-3"
  }, /*#__PURE__*/React.createElement(Clock, {
    className: "h-5 w-5 text-dem-blue-500 flex-shrink-0 mt-1"
  }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-gray-700"
  }, /*#__PURE__*/React.createElement("strong", {
    className: "font-semibold text-gray-800"
  }, translations.time, ":"), " ", formatTime(committeeMeeting.start, committeeMeeting.end, committeeMeeting.isAllDay)))), committeeMeeting.location && /*#__PURE__*/React.createElement("div", {
    className: "flex items-start space-x-3"
  }, /*#__PURE__*/React.createElement(MapPin, {
    className: "h-5 w-5 text-dem-blue-500 flex-shrink-0 mt-1"
  }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-gray-700"
  }, /*#__PURE__*/React.createElement("strong", {
    className: "font-semibold text-gray-800"
  }, translations.location, ":"), /*#__PURE__*/React.createElement("br", null), committeeMeeting.location && (() => {
    // Split by comma or semicolon, then trim whitespace from each part and filter out any empty strings
    const parts = committeeMeeting.location.split(/[,;]/).map(p => p.trim()).filter(p => p.length > 0 && p !== 'USA');
    if (parts.length === 0) {
      return null; // Or some default text if preferred
    }

    // The first part is assumed to be the street address
    const streetAddress = parts[0];

    // The rest of the parts are city, state, zip, country
    // We'll join them back with a comma and a space
    const remainingParts = parts.slice(1).join(', ');
    return /*#__PURE__*/React.createElement(React.Fragment, null, streetAddress, remainingParts && /*#__PURE__*/React.createElement("br", null), " ", remainingParts);
  })()))))));
};
export default NextCommitteeMeeting;
//# sourceMappingURL=NextCommitteeMeeting.js.map