"use client";

import React, { useState } from 'react';
import { MdClose, MdAdd } from 'react-icons/md';

type Event = {
  id: string;
  title: string;
  date: string;
  description: string;
};

const UpcomingEvents = () => {
  const [events, setEvents] = useState<Event[]>([
    {
      id: "1",
      title: "Pre-Haji Orientation",
      date: "June 1, 2024",
      description: "Online Webinar",
    }
  ]);

  const [newEvent, setNewEvent] = useState({
    title: "",
    date: "",
    description: ""
  });

  const [showForm, setShowForm] = useState(false);



  const handleAddEvent = () => {
    if (!newEvent.title || !newEvent.date) return;

    const event: Event = {
      id: Date.now().toString(),
      ...newEvent,
    };

    setEvents([...events, event]);
    setNewEvent({ title: "", date: "", description: "" });
    setShowForm(false);
  };

  const handleRemoveEvent = (id: string) => {
    setEvents(events.filter(event => event.id !== id));
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Upcoming Events</h1>
        <button 
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1 bg-blue-600 text-white px-3 py-1 rounded-md hover:bg-blue-700"
        >
          <MdAdd size={18} />
          Add Event
        </button>
      </div>

      {showForm && (
        <div className="bg-gray-50 p-4 rounded-lg space-y-3">
          <div className="space-y-2">
            <input
              type="text"
              value={newEvent.title}
              onChange={(e) => setNewEvent({...newEvent, title: e.target.value})}
              placeholder="Event Title"
              className="w-full p-2 border rounded  text-gray-700"
            />
            <input
              type="text"
              value={newEvent.date}
              onChange={(e) => setNewEvent({...newEvent, date: e.target.value})}
              placeholder="Date (e.g., June 1, 2024)"
              className="w-full p-2 border rounded text-gray-700"
            />
            <input
              type="text"
              value={newEvent.description}
              onChange={(e) => setNewEvent({...newEvent, description: e.target.value})}
              placeholder="Description/Location"
              className="w-full p-2 border rounded text-gray-700"
            />
            
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleAddEvent}
              className="bg-green-600 text-white px-3 py-1 rounded-md hover:bg-green-700"
            >
              Save Event
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="bg-gray-500 text-white px-3 py-1 rounded-md hover:bg-gray-600"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {events.map((event) => (
          <div key={event.id} className="border-l-4 border-blue-500 pl-4 py-2 bg-gray-50 rounded-r">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-bold text-gray-800">{event.title}</h3>
                <p className="text-gray-600">{event.date}</p>
                {event.description && (
                  <p className="text-gray-500 text-sm mt-1">{event.description}</p>
                )}
              </div>
              <button
                onClick={() => handleRemoveEvent(event.id)}
                className="text-red-500 hover:text-red-700"
              >
                <MdClose size={18} />
              </button>
            </div>
           
          </div>
        ))}
      </div>
    </div>
  );
};

export default UpcomingEvents;