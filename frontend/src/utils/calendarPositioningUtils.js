const getEventTime = (dateStr) => new Date(dateStr).getTime();

const areExactTimeMatch = (event1, event2) => {
  const start1 = getEventTime(event1.start_time);
  const start2 = getEventTime(event2.start_time);
  const end1 = getEventTime(event1.end_time);
  const end2 = getEventTime(event2.end_time);
  return start1 === start2 && end1 === end2;
};

const isContainedWithin = (event, container) => {
  const eventStart = getEventTime(event.start_time);
  const eventEnd = getEventTime(event.end_time);
  const containerStart = getEventTime(container.start_time);
  const containerEnd = getEventTime(container.end_time);
  return eventStart >= containerStart && eventEnd <= containerEnd;
};

const eventsOverlap = (event1, event2) => {
  const start1 = getEventTime(event1.start_time);
  const end1 = getEventTime(event1.end_time);
  const start2 = getEventTime(event2.start_time);
  const end2 = getEventTime(event2.end_time);
  return start1 < end2 && end1 > start2;
};

export const calculateEventColumns = (events) => {
  const positions = new Map();
  const overlappingSets = new Set();

  // Sort events by start time and duration
  const sortedEvents = [...events].sort((a, b) => {
    const aStart = getEventTime(a.start_time);
    const bStart = getEventTime(b.start_time);
    if (aStart !== bStart) return aStart - bStart;
    
    // If same start time, longer event comes first
    const aDuration = getEventTime(a.end_time) - aStart;
    const bDuration = getEventTime(b.end_time) - bStart;
    return bDuration - aDuration;
  });

  // First pass: identify overlapping events
  sortedEvents.forEach((event1, i) => {
    sortedEvents.forEach((event2, j) => {
      if (i < j && eventsOverlap(event1, event2)) {
        overlappingSets.add(event1.id);
        overlappingSets.add(event2.id);
      }
    });
  });

  // Second pass: group actually overlapping events
  const overlappingGroups = [];
  const processedEvents = new Set();

  sortedEvents.forEach(event => {
    if (processedEvents.has(event.id)) return;

    if (overlappingSets.has(event.id)) {
      // Find all events that overlap with this one
      const overlappingGroup = [event];
      sortedEvents.forEach(other => {
        if (other.id !== event.id && !processedEvents.has(other.id) && eventsOverlap(event, other)) {
          overlappingGroup.push(other);
        }
      });

      overlappingGroup.forEach(e => processedEvents.add(e.id));
      overlappingGroups.push(overlappingGroup);
    } else {
      // Non-overlapping event gets full width
      positions.set(event.id, {
        column: 0,
        totalColumns: 1,
        width: '100%',
        left: '0%',
        zIndex: 20,
        opacity: 0.65  // Lower base opacity for non-overlapping events
      });
      processedEvents.add(event.id);
    }
  });

  // Process overlapping groups with stronger opacity contrast
  overlappingGroups.forEach(group => {
    const width = 95 / group.length;
    group.forEach((event, index) => {
      positions.set(event.id, {
        column: index,
        totalColumns: group.length,
        width: `${width}%`,
        left: `${index * width}%`,
        zIndex: 20 + index,
        opacity: 0.65 + (index * 0.25)  // Increased opacity steps for better contrast
      });
    });
  });

  return positions;
};

export const processEvents = (events) => {
  const segments = [];
  const processed = new Set();

  // Sort by duration (longest first)
  const sortedEvents = [...events].sort((a, b) => {
    const aDuration = new Date(a.end_time) - new Date(a.start_time);
    const bDuration = new Date(b.end_time) - new Date(b.start_time);
    return bDuration - aDuration;
  });

  // Process containers first
  sortedEvents.forEach(container => {
    if (processed.has(container.id)) return;

    const containedEvents = sortedEvents.filter(e => 
      e.id !== container.id && 
      !processed.has(e.id) && 
      isContainedWithin(e, container)
    );

    if (containedEvents.length > 0) {
      segments.push({
        event: container,
        isContainer: true,
        left: '0%',
        width: '95%',
        zIndex: 5,
        opacity: 0.65 // Lower base opacity for container
      });
      processed.add(container.id);

      const positions = calculateEventColumns(containedEvents);
      containedEvents.forEach(event => {
        const pos = positions.get(event.id);
        const adjustedWidth = parseFloat(pos.width) * 0.92;
        const adjustedLeft = 4 + parseFloat(pos.left) * 0.92;
        
        segments.push({
          event,
          isContained: true,
          left: `${adjustedLeft}%`,
          width: `${adjustedWidth}%`,
          zIndex: 10 + (pos.column || 0),
          opacity: pos.opacity || 0.65
        });
        processed.add(event.id);
      });
    }
  });

  // Process remaining events
  const remainingEvents = sortedEvents.filter(e => !processed.has(e.id));
  if (remainingEvents.length > 0) {
    const positions = calculateEventColumns(remainingEvents);
    remainingEvents.forEach(event => {
      const pos = positions.get(event.id);
      segments.push({
        event,
        left: pos.left,
        width: pos.width,
        zIndex: 15 + (pos.column || 0),
        opacity: pos.opacity || 0.65
      });
    });
  }

  return segments;
};