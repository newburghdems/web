import React, { useState, useEffect, useMemo } from 'react';
import { Loader2, CalendarHeart, Calendar, Clock, MapPin, CalendarClock, CalendarPlus } from 'lucide-react';
import ical from 'ical';

const UpcomingEvents = ({ calendarUrl }) => {
  const [lang, setLang] = useState('en');
  const [translations, setTranslations] = useState({});
  const [otherEvents, setOtherEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const locale = () => {
    return `${lang}-US`;
  }

  const eventsPagePath = () => {
    if (lang === 'es') {
      return '/es/events';
    }

    return '/events';
  }

  const formatDate = (startDate, endDate) => {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    let dateString = startDate.toLocaleDateString(locale(), options);

    if (isMultiDay(startDate, endDate) || !isSameDay(startDate, endDate)) {
      // For multi-day events, or if end date is significantly different and on a different day
      const endOptions = { year: 'numeric', month: 'long', day: 'numeric' };
      dateString += ` - ${new Date(endDate).toLocaleDateString(locale(), endOptions)}`;
    }
    return dateString;
  };

  const formatTime = (startDate, endDate, isAllDay) => {
    if (isAllDay) return 'All Day';
    const options = { hour: 'numeric', minute: 'numeric', hour12: true };
    let timeString = startDate.toLocaleTimeString(locale(), options);
    if (endDate && !isSameTime(startDate, endDate)) {
      timeString += ` - ${new Date(endDate).toLocaleTimeString(locale(), options)}`;
    }
    return timeString;
  };

  const formatDateTimeForOtherEvents = (startDate, isAllDay) => {
    const dateOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    let dateTimeString = new Date(startDate).toLocaleDateString(locale(), dateOptions);
    if (!isAllDay) {
      const timeOptions = { hour: 'numeric', minute: 'numeric', hour12: true };
      dateTimeString += ` - ${new Date(startDate).toLocaleTimeString(locale(), timeOptions)}`;
    }
    return dateTimeString;
  }

  const isSameDay = (date1, date2) => {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    return d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate();
  };

  const isMultiDay = (date1, date2) => {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    // If the event spans more than 24 hours, or ends on a different day
    return (d2.getTime() - d1.getTime()) > (24 * 60 * 60 * 1000 - 1) && !isSameDay(d1, d2);
  };

  const isSameTime = (date1, date2) => {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    return d1.getHours() === d2.getHours() && d1.getMinutes() === d2.getMinutes();
  }

  useEffect(() => {
    const container = document.getElementById('upcoming-events-react');
    const pageLang = container?.dataset?.lang || 'en';
    setLang(pageLang);

    if (window.siteTranslations && window.siteTranslations[pageLang]) {
      setTranslations(window.siteTranslations[pageLang].home.upcoming_events);
    }

    if (!calendarUrl) {
      setError(translations.no_calendar_url);
      setLoading(false);
      return;
    }

    const fetchEvents = async () => {
      try {
        const response = await fetch(calendarUrl);
        if (!response.ok) {
          throw new Error(`${translations.failed_to_fetch_ics}: ${response.statusText}`);
        }
        const icsData = await response.text();
        const parsedCal = ical.parseICS(icsData);

        const now = new Date();
        const events = [];

        for (const k in parsedCal) {
          if (parsedCal.hasOwnProperty(k)) {
            const event = parsedCal[k];
            if (event.type === 'VEVENT') {
              let startDate = new Date(event.start);
              let endDate = new Date(event.end || event.start);

              // Handle recurring events: find the next occurrence
              if (event.rrule) {
                const rrule = event.rrule;
                const nextOccurrences = rrule.all((date, i) => i < 10); // Get next 10 occurrences

                for (const occ of nextOccurrences) {
                  if (occ >= now) {
                    startDate = new Date(occ);
                    const duration = new Date(event.end).getTime() - new Date(event.start).getTime();
                    endDate = new Date(startDate.getTime() + duration);
                    break; // Use the first future occurrence
                  }
                }
              }

              // Only consider events that are still upcoming or ongoing
              if (endDate >= now) {
                const isAllDayEvent = event.start.length === 8 || (event.datetype && event.datetype === 'date');

                events.push({
                  uid: event.uid,
                  title: event.summary || translations.no_title,
                  start: startDate,
                  end: endDate,
                  location: event.location || '',
                  description: event.description || '',
                  isAllDay: isAllDayEvent,
                });
              }
            }
          }
        }

        events.sort((a, b) => a.start - b.start);

        const upcomingOtherEvents = [];

        for (const event of events) {
          if (upcomingOtherEvents.length < 6) {
            upcomingOtherEvents.push(event);
          }
          if (upcomingOtherEvents.length >= 6) break;
        }

        setOtherEvents(upcomingOtherEvents);

      } catch (err) {
        console.error(`${translations.error_parsing_ics}:`, err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, [calendarUrl]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center py-10">
        <Loader2 className="h-12 w-12 animate-spin text-dem-blue-500 mx-auto" />
        <p className="mt-2 text-gray-600">{translations.loading}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center py-10">
        <p className="text-red-500">{translations.could_not_load_events}: {error}</p>
      </div>
    );
  }

  if (otherEvents.length === 0) {
    return (
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center py-10">
        <p className="text-gray-600">{translations.no_upcoming_events}</p>
        <div className="text-center mt-12 sm:mt-16">
          <a href="{eventsPagePath()}" className="inline-flex items-center bg-dem-blue-500 hover:bg-dem-blue-600 text-white font-semibold py-3 px-7 rounded-md text-lg transition-colors duration-300 shadow hover:shadow-md group">
            <CalendarPlus className="h-5 w-5 mr-2 transform transition-transform duration-200 group-hover:scale-110" />
            {translations.view_full_calendar}
          </a>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mt-8 md:mt-0">
        <h3 className="font-merriweather text-2xl sm:text-3xl font-semibold text-dem-blue-600 mb-4">{translations.also_coming_up}</h3>
        {otherEvents.length > 0 ? (
          <ul className="space-y-4">
            {otherEvents.map((event, index) => (
              <li key={event.uid || index} className="border-b border-gray-200 pb-3.5">
                <h4 className="font-inter text-base font-semibold text-dem-blue-500 mb-1">{event.title}</h4>
                <p className="text-xs text-gray-600 flex items-center">
                  <CalendarClock className="h-3.5 w-3.5 mr-1.5 text-gray-400 flex-shrink-0" />
                  {formatDateTimeForOtherEvents(event.start, event.isAllDay)}
                </p>
                {event.location && <p className="text-xs text-gray-500 mt-1 ml-5">{event.location}</p>}
              </li>
            ))}
          </ul>
        ) : (
          <p className="font-inter text-gray-600">{translations.also_coming_up}</p>
        )}
      </div>

      <div className="mt-6">
        <a href={eventsPagePath()} className="inline-flex items-center bg-dem-blue-500 hover:bg-dem-blue-600 text-white font-semibold py-3 px-7 rounded-md text-lg transition-colors duration-300 shadow hover:shadow-md group">
          <CalendarPlus className="h-5 w-5 mr-2 transform transition-transform duration-200 group-hover:scale-110" />
          {translations.view_all_events}
        </a>
      </div>
    </div>
  );
};

export default UpcomingEvents;
