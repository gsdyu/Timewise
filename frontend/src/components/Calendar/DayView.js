'use client';

import React, { useState, useEffect } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { isToday, formatHour } from '@/utils/dateUtils';

const DayView = ({ currentDate, events, onDateDoubleClick, onEventClick, shiftDirection }) => {
  const { darkMode } = useTheme();
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  const isAllDayEvent = (event) => {
    const startDate = new Date(event.start_time);
    const endDate = new Date(event.end_time);
    return startDate.getHours() === 0 && startDate.getMinutes() === 0 &&
           endDate.getHours() === 23 && endDate.getMinutes() === 59 &&
           startDate.getDate() === endDate.getDate() &&
           startDate.getMonth() === endDate.getMonth() &&
           startDate.getFullYear() === endDate.getFullYear();
  };

  const getEventStyle = (event) => {
    const startDate = new Date(event.start_time);
    const endDate = new Date(event.end_time);
    const startHour = startDate.getHours();
    const startMinute = startDate.getMinutes();
    const endHour = endDate.getHours();
    const endMinute = endDate.getMinutes();

    const top = (startHour + startMinute / 60) * 60; // 60px per hour
    const height = ((endHour - startHour) + (endMinute - startMinute) / 60) * 60;

    return {
      top: `${top}px`,
      height: `${height}px`,
      left: '0',
      right: '20px',
      zIndex: 10, // Ensure events are above the grid
    };
  };

  const getCurrentTimePosition = () => {
    const hours = currentTime.getHours();
    const minutes = currentTime.getMinutes();
    return (hours + minutes / 60) * 60;
  };

  const filteredEvents = events.filter(event => {
    const eventDate = new Date(event.start_time);
    return eventDate.toDateString() === currentDate.toDateString();
  });

  const allDayEvents = filteredEvents.filter(event => isAllDayEvent(event));
  const timedEvents = filteredEvents.filter(event => !isAllDayEvent(event));

  const handleEventClick = (event, e) => {
    e.stopPropagation();
    onEventClick(event);
  };

  const handleDateDoubleClick = (date, isAllDay, e) => {
    e.preventDefault();
    onDateDoubleClick(date, isAllDay);
  };

  const scrollbarStyles = darkMode ? `
    .dark-scrollbar::-webkit-scrollbar {
      width: 12px;
    }
    .dark-scrollbar::-webkit-scrollbar-track {
      background: #2D3748;
    }
    .dark-scrollbar::-webkit-scrollbar-thumb {
      background-color: #4A5568;
      border-radius: 6px;
      border: 3px solid #2D3748;
    }
    .dark-scrollbar {
      scrollbar-width: thin;
      scrollbar-color: #4A5568 #2D3748;
    }
  ` : '';

  const renderAllDayEvent = (event) => {
    const eventColor = event.color || 'blue';
    return (
      <div
        key={event.id}
        className={`
          flex justify-between items-center
          text-xs mb-1 truncate cursor-pointer
          rounded-full py-1 px-2
          bg-${eventColor}-500 text-white
          hover:bg-opacity-80 transition-colors duration-200 z-40
          mr-5
        `}
        onClick={(e) => handleEventClick(event, e)}
        style={{ position: 'relative', zIndex: 40 }}
      >
        <span className="truncate">{event.title}</span>
      </div>
    );
  };

  return (
    <div className={`h-full flex flex-col ${darkMode ? 'bg-gray-900 text-gray-200' : 'bg-white text-gray-800'}`}>
      <style>{scrollbarStyles}</style>
      
      {/* Compact, Centered Day header */}
      <div className={`flex justify-center items-center py-2 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
        <div className={`flex items-center ${isToday(currentDate) ? 'bg-blue-500' : darkMode ? 'bg-gray-800' : 'bg-gray-200'} rounded-full px-4 py-1`}>
          <span className="text-3xl font-bold mr-2">{currentDate.getDate()}</span>
          <span className="text-lg">{currentDate.toLocaleString('default', { weekday: 'long' })}</span>
        </div>
      </div>

      {/* All-day events section */}
      <div className={`border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'} min-h-[40px] relative flex`}>
        <div className="w-16 flex-shrink-0 text-xs pr-2 flex items-center justify-end">
          All-day
        </div>
        <div className={`w-px ${darkMode ? 'bg-gray-700' : 'bg-gray-300'}`}></div>
        <div 
          className="flex-grow relative p-1"
          onDoubleClick={(e) => handleDateDoubleClick(new Date(currentDate), true, e)}
        >
          {allDayEvents.map(event => renderAllDayEvent(event))}
        </div>
      </div>

      {/* Time slots */}
      <div className={`flex-1 overflow-y-auto ${darkMode ? 'dark-scrollbar' : ''} relative`}>
        <div className="flex" style={{ height: '1440px' }}> {/* 24 hours * 60px per hour */}
          {/* Time column */}
          <div className="w-16 flex-shrink-0 relative">
            {hours.map((hour) => (
              <div 
                key={hour} 
                className="absolute w-full pr-2 text-right text-xs flex items-center justify-end" 
                style={{ 
                  top: `${hour * 60}px`, 
                  height: '60px',
                  transform: 'translateY(-50%)'  // This centers the text vertically
                }}
              >
                {hour === 0 ? null : formatHour(hour)}
              </div>
            ))}
          </div>
          
          {/* Separator line */}
          <div className={`w-px ${darkMode ? 'bg-gray-700' : 'bg-gray-300'}`} style={{ height: '1440px' }}></div>

          {/* Events area */}
          <div className="flex-grow relative" style={{ height: '1440px' }}>
            {hours.map((hour, index) => (
              <div 
                key={hour} 
                className={`absolute w-full ${index < hours.length - 1 ? `border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}` : ''}`} 
                style={{ top: `${hour * 60}px`, height: '60px' }}
                onDoubleClick={(e) => {
                  const clickedDate = new Date(currentDate);
                  clickedDate.setHours(hour);
                  handleDateDoubleClick(clickedDate, false, e);
                }}
              ></div>
            ))}
            {timedEvents.map(event => (
              <div
                key={event.id}
                className="absolute bg-blue-500 text-white text-xs overflow-hidden rounded cursor-pointer hover:bg-blue-600 transition-colors duration-200 border border-blue-600"
                style={getEventStyle(event)}
                onClick={(e) => handleEventClick(event, e)}
              >
                <div className="w-full h-full p-1 flex flex-col pointer-events-auto">
                  <div className="font-bold">{event.title}</div>
                  <div className="text-xs">
                    {new Date(event.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - 
                    {new Date(event.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            ))}
            {/* Current time indicator */}
            {isToday(currentDate) && (
              <div
                className="absolute left-0 right-0 z-20"
                style={{ top: `${getCurrentTimePosition()}px` }}
              >
                <div className="relative w-full">
                  <div className="absolute left-0 right-0 border-t border-red-500"></div>
                  <div className="absolute left-0 w-3 h-3 bg-red-500 rounded-full transform -translate-x-1.5 -translate-y-1.5"></div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DayView;