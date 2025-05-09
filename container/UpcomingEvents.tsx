"use client";

import React, { useState, useEffect } from 'react';
import { MdClose, MdAdd, MdDelete, MdList, MdEdit } from 'react-icons/md';
import { getFirestore, collection, doc, setDoc, getDocs, deleteDoc, updateDoc } from "firebase/firestore";
import { signInAnonymousUser } from "../utils/firebase";

const firestore = getFirestore();

type Event = {
  id: string;
  title: string;
  date: string;
  description: string;
  url: string;
  timestamp: string;
  folderId: number; // Added folderId
};

const UpcomingEvents = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [newEvent, setNewEvent] = useState({
    title: "",
    date: "",
    description: "",
    url: ""
  });
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showList, setShowList] = useState(true);
  const [currentFolderId, setCurrentFolderId] = useState<number>(1);

  useEffect(() => {
    signInAnonymousUser().catch(() => {
      setError("Authentication failed. Operations may not work properly.");
    });
    fetchAllEvents();
  }, []);

  const getNextFolderId = () => {
    if (events.length === 0) return 1;
    return Math.max(...events.map(event => event.folderId)) + 1;
  };

  const fetchAllEvents = async () => {
    setIsLoading(true);
    try {
      const eventsCollection = collection(firestore, 'upcoming_events');
      const querySnapshot = await getDocs(eventsCollection);
      
      const allEvents: Event[] = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data() as Event;
        allEvents.push({
          id: doc.id,
          title: data.title,
          date: data.date,
          description: data.description,
          url: data.url,
          timestamp: data.timestamp,
          folderId: data.folderId || 1 // Default to 1 if not set
        });
      });
      
      // Sort events by folderId (ascending)
      allEvents.sort((a, b) => a.folderId - b.folderId);
      setEvents(allEvents);

      // Set next folder ID
      if (allEvents.length > 0) {
        setCurrentFolderId(Math.max(...allEvents.map(e => e.folderId)) + 1);
      }
    } catch (err) {
      console.error("Error fetching events:", err);
      setError("Failed to load events");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddEvent = async () => {
    if (!newEvent.title || !newEvent.date) {
      setError("Title and date are required");
      return;
    }

    try {
      const folderId = getNextFolderId();
      
      // Create event data for Firestore
      const eventData = {
        title: newEvent.title,
        date: newEvent.date,
        description: newEvent.description,
        url: newEvent.url,
        timestamp: new Date().toISOString(),
        folderId: folderId
      };

      // Add to Firestore with folderId as document ID
      const contentRef = doc(collection(firestore, 'upcoming_events'), `${folderId}`);
      await setDoc(contentRef, eventData);

      // Refresh the events list
      await fetchAllEvents();
      
      // Reset form
      setNewEvent({
        title: "",
        date: "",
        description: "",
        url: ""
      });
      setError("");
    } catch (error) {
      console.error("Error adding event:", error);
      setError("Failed to add event");
    }
  };

  const handleEditEvent = (event: Event) => {
    setEditingEvent(event);
    setIsEditing(true);
    setShowList(false);
  };

  const handleUpdateEvent = async () => {
    if (!editingEvent || !editingEvent.id) return;
    
    if (!editingEvent.title || !editingEvent.date) {
      setError("Title and date are required");
      return;
    }

    try {
      // Update data for Firestore (maintaining original folderId)
      const eventData = {
        title: editingEvent.title,
        date: editingEvent.date,
        description: editingEvent.description,
        url: editingEvent.url,
        timestamp: editingEvent.timestamp,
        folderId: editingEvent.folderId
      };

      // Update in Firestore using folderId as document ID
      const contentRef = doc(firestore, 'upcoming_events', `${editingEvent.folderId}`);
      await updateDoc(contentRef, eventData);

      // Refresh the events list
      await fetchAllEvents();
      
      // Reset editing state
      cancelEdit();
    } catch (error) {
      console.error("Error updating event:", error);
      setError("Failed to update event");
    }
  };

  const cancelEdit = () => {
    setEditingEvent(null);
    setIsEditing(false);
    setError("");
  };

  const handleDeleteEvent = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this event?")) return;

    try {
      // Delete document from Firestore
      await deleteDoc(doc(firestore, 'upcoming_events', id));
      
      // Update local state
      setEvents(events.filter(event => event.id !== id));
    } catch (error) {
      console.error("Error deleting event:", error);
      setError("Failed to delete event");
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Upcoming Events</h1>
        <button
          onClick={() => setShowList(!showList)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          <MdList size={20} />
          {showList ? "Hide List" : "Show List"}
        </button>
      </div>

      {showList ? (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">All Upcoming Events</h2>
          {isLoading ? (
            <div className="text-center py-4">
              <p>Loading events...</p>
            </div>
          ) : events.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No events available</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {events.map((event) => (
                <div key={event.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors relative">
                  <div className="absolute top-2 right-2 flex space-x-2">
                    <button
                      onClick={() => handleEditEvent(event)}
                      className="text-blue-500 hover:text-blue-700"
                      aria-label="Edit event"
                    >
                      <MdEdit size={20} />
                    </button>
                    <button
                      onClick={() => handleDeleteEvent(event.id)}
                      className="text-red-500 hover:text-red-700"
                      aria-label="Delete event"
                    >
                      <MdDelete size={20} />
                    </button>
                  </div>
                  
                  <div className='mt-3'>
                    <h3 className="font-medium text-lg text-gray-800">{event.title}</h3>
                    <p className="text-sm text-gray-500 mb-2">{event.date}</p>
                    <p className="text-xs text-gray-400 mb-1">Folder ID: {event.folderId}</p>
                    {event.description && (
                      <p className="text-gray-700 mb-2">{event.description}</p>
                    )}
                   <p className='text-sm text-blue-800 mb-1'>{event.url}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Add/Edit Event Form */}
          <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200">
            <h2 className="text-lg font-semibold text-gray-700 mb-4">
              {isEditing ? "Edit Event" : "Add New Event"}
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title*</label>
                <input
                  type="text"
                  value={isEditing ? editingEvent?.title || "" : newEvent.title}
                  onChange={(e) => isEditing 
                    ? setEditingEvent({...editingEvent!, title: e.target.value})
                    : setNewEvent({...newEvent, title: e.target.value})}
                  className="w-full p-2 border rounded text-gray-700 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter title..."
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date*</label>
                <input
                  type="date"
                  value={isEditing ? editingEvent?.date || "" : newEvent.date}
                  onChange={(e) => isEditing 
                    ? setEditingEvent({...editingEvent!, date: e.target.value})
                    : setNewEvent({...newEvent, date: e.target.value})}
                  className="w-full p-2 border rounded text-gray-700 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., June 1, 2024"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={isEditing ? editingEvent?.description || "" : newEvent.description}
                  onChange={(e) => isEditing 
                    ? setEditingEvent({...editingEvent!, description: e.target.value})
                    : setNewEvent({...newEvent, description: e.target.value})}
                  className="w-full p-2 border rounded h-24 text-gray-700 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter description..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">URL</label>
                <input
                  type="text"
                  value={isEditing ? editingEvent?.url || "" : newEvent.url}
                  onChange={(e) => isEditing 
                    ? setEditingEvent({...editingEvent!, url: e.target.value})
                    : setNewEvent({...newEvent, url: e.target.value})}
                  className="w-full p-2 border rounded text-gray-700 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter URL (optional)"
                />
              </div>

              {error && (
                <div className="p-2 text-sm text-red-700 bg-red-100 rounded-lg">
                  {error}
                </div>
              )}

              {isEditing ? (
                <div className="flex space-x-2">
                  <button
                    onClick={handleUpdateEvent}
                    disabled={!editingEvent?.title || !editingEvent?.date}
                    className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                  >
                    Update
                  </button>
                  <button
                    onClick={cancelEdit}
                    className="flex-1 bg-gray-500 text-white py-2 px-4 rounded-md hover:bg-gray-600 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleAddEvent}
                  disabled={!newEvent.title || !newEvent.date}
                  className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                  Add Event
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UpcomingEvents;