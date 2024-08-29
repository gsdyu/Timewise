'use client';

import React from 'react';
import { useTheme } from '@/contexts/ThemeContext';

const MonthView = ({ currentDate, selectedDate, onDateClick, onDateDoubleClick, shiftDirection }) => {
  const { darkMode } = useTheme();

  const isToday = (date) => {
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
  };

  const isWeekend = (date) => {
    const day = date.getDay();
    return day === 0 || day === 6; // 0 is Sunday, 6 is Saturday
  };

  const isSameDay = (date1, date2) => {
    return date1 && date2 &&
      date1.getDate() === date2.getDate() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getFullYear() === date2.getFullYear();
  };

  const getDaysInMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(currentDate);
    const firstDay = getFirstDayOfMonth(currentDate);
    const daysInPrevMonth = getDaysInMonth(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    
    const days = [];
    let dayCounter = 1;
    let nextMonthCounter = 1;

    for (let i = 0; i < 6 * 7; i++) {
      let dayNumber;
      let isCurrentMonth = true;

      if (i < firstDay) {
        dayNumber = daysInPrevMonth - firstDay + i + 1;
        isCurrentMonth = false;
      } else if (dayCounter <= daysInMonth) {
        dayNumber = dayCounter;
        dayCounter++;
      } else {
        dayNumber = nextMonthCounter;
        nextMonthCounter++;
        isCurrentMonth = false;
      }

      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() + (isCurrentMonth ? 0 : dayCounter > daysInMonth ? 1 : -1), dayNumber);
      const isCurrentDay = isToday(date);
      const isWeekendDay = isWeekend(date);
      const isSelected = isSameDay(date, selectedDate);

      days.push(
        <div
          key={i}
          className={`border-r border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'} ${
            isCurrentMonth ? darkMode ? 'bg-gray-800' : 'bg-white' : darkMode ? 'bg-gray-900' : 'bg-gray-100'
          } ${isWeekendDay ? darkMode ? 'bg-opacity-90' : 'bg-opacity-95' : ''} p-1 relative overflow-hidden`}
          onClick={() => isCurrentMonth && onDateClick(date)}
          onDoubleClick={() => isCurrentMonth && onDateDoubleClick(date)}
        >
          <span
            className={`inline-flex items-center justify-center w-6 h-6 text-sm 
              ${isCurrentDay ? 'bg-blue-500 text-white rounded-full' : ''}
              ${isSelected && !isCurrentDay ? darkMode ? 'bg-blue-700 text-white rounded-full' : 'bg-blue-200 rounded-full' : ''}
              ${isCurrentMonth ? darkMode ? 'text-gray-100' : 'text-gray-700' : darkMode ? 'text-gray-600' : 'text-gray-400'}
              ${isWeekendDay && !isCurrentDay && !isSelected ? darkMode ? 'text-gray-300' : 'text-gray-600' : ''}
              transition-all duration-300 ease-in-out
              ${shiftDirection === 'left' ? 'translate-x-full opacity-0' : 
                shiftDirection === 'right' ? '-translate-x-full opacity-0' : 
                'translate-x-0 opacity-100'}
            `}
          >
            {dayNumber}
          </span>
        </div>
      );
    }
    return days;
  };

  return (
    <div className={`h-full flex flex-col ${darkMode ? 'bg-gray-900' : 'bg-gray-100'}`}>
      <div className={`grid grid-cols-7 border-b border-l ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
        {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map(day => (
          <div key={day} className={`py-1 text-center text-xs font-medium ${darkMode ? 'text-gray-400 border-r border-gray-700' : 'text-gray-600 border-r border-gray-200'}`}>
            {day}
          </div>
        ))}
      </div>
      <div className={`flex-1 grid grid-cols-7 border-l ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
        {renderCalendar()}
      </div>
    </div>
  );
};

export default MonthView;