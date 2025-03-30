"use client";

import React, { useState, useEffect } from 'react';
import { MdClose, MdAdd } from 'react-icons/md';
import { ref, uploadBytesResumable, getDownloadURL, getStorage, listAll, deleteObject } from "firebase/storage";
import { signInAnonymousUser } from "../utils/firebase";

const storage = getStorage();

type Event = {
  id: string;
  title: string;
  date: string;
  description: string;
};

const UpcomingEvents = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [newEvent, setNewEvent] = useState({
    title: "",
    date: "",
    description: ""
  });
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState("");
  const [nextFolderId, setNextFolderId] = useState<number | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    signInAnonymousUser().catch(() => {
      setError("Authentication failed. Uploads may not work properly.");
    });
    fetchEvents();
  }, []);

  useEffect(() => {
    const fetchHighestFolderId = async () => {
      try {
        const eventsRef = ref(storage, 'upcoming_events');
        const result = await listAll(eventsRef);
        
        const folderIds = result.prefixes.map(folderRef => {
          const folderName = folderRef.name;
          const folderId = parseInt(folderName, 10);
          return isNaN(folderId) ? 0 : folderId;
        });
        
        const highestId = folderIds.length > 0 ? Math.max(...folderIds) : 0;
        setNextFolderId(highestId + 1);
      } catch (error) {
        console.error("Error fetching folder IDs:", error);
        setNextFolderId(1);
      }
    };
    
    fetchHighestFolderId();
  }, []);

  const fetchEvents = async () => {
    try {
      setIsLoading(true);
      const eventsRef = ref(storage, 'upcoming_events');
      const result = await listAll(eventsRef);
      
      const eventPromises = result.prefixes.map(async (folderRef) => {
        try {
          const eventFileRef = ref(storage, `${folderRef.fullPath}/event_data.json`);
          const downloadURL = await getDownloadURL(eventFileRef);
          const response = await fetch(downloadURL);
          return await response.json();
        } catch (error) {
          console.error(`Error loading event from ${folderRef.name}:`, error);
          return null;
        }
      });

      const loadedEvents = (await Promise.all(eventPromises)).filter(Boolean);
      setEvents(loadedEvents);
    } catch (error) {
      console.error("Error fetching events:", error);
      setError("Failed to load events");
    } finally {
      setIsLoading(false);
    }
  };

  const saveEventToFirebase = async (event: Event): Promise<boolean> => {
    if (!storage) {
      setError("Storage service not available");
      return false;
    }
  
    if (nextFolderId === null) {
      setError("Preparing upload location, please try again in a moment");
      return false;
    }

    try {
      setIsUploading(true);
      const eventRef = ref(storage, `upcoming_events/${nextFolderId}/event_data.json`);
      const eventBlob = new Blob([JSON.stringify(event)], { type: 'application/json' });
      
      return new Promise((resolve, reject) => {
        const uploadTask = uploadBytesResumable(eventRef, eventBlob);

        uploadTask.on(
          "state_changed",
          (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            setUploadProgress(progress);
          },
          (error) => {
            setIsUploading(false);
            setError(`Upload failed: ${error.message}`);
            reject(false);
          },
          async () => {
            try {
              await getDownloadURL(uploadTask.snapshot.ref);
              setIsUploading(false);
              setUploadProgress(0);
              resolve(true);
            } catch (error) {
              setIsUploading(false);
              setError("Failed to get download URL");
              reject(false);
            }
          }
        );
      });
    } catch (err) {
      setIsUploading(false);
      setError("Failed to start upload");
      console.error(err);
      return false;
    }
  };

  const deleteEventFromFirebase = async (id: string) => {
    try {
      const eventsRef = ref(storage, 'upcoming_events');
      const result = await listAll(eventsRef);
      
      for (const folderRef of result.prefixes) {
        try {
          const eventFileRef = ref(storage, `${folderRef.fullPath}/event_data.json`);
          const downloadURL = await getDownloadURL(eventFileRef);
          const response = await fetch(downloadURL);
          const event = await response.json();
          
          if (event.id === id) {
            await deleteObject(eventFileRef);
            return true;
          }
        } catch (error) {
          console.error(`Error checking folder ${folderRef.name}:`, error);
        }
      }
      return false;
    } catch (error) {
      console.error("Error deleting event:", error);
      return false;
    }
  };

  const handleAddEvent = async () => {
    if (!newEvent.title || !newEvent.date) {
      setError("Title and date are required");
      return;
    }

    const event: Event = {
      id: Date.now().toString(),
      ...newEvent
    };

    console.log("Attempting to save event:", event);

    const success = await saveEventToFirebase(event);
    if (success) {

        console.log("Event saved successfully, refreshing list...");
      await fetchEvents(); // Refresh the list from Firebase
      setNewEvent({ title: "", date: "", description: "" });
      setShowForm(false);
      setError("");
      setNextFolderId(prevId => prevId !== null ? prevId + 1 : 1);
    }else{
        console.log("Failed to save event");
    }
  };

  const handleRemoveEvent = async (id: string) => {
    const success = await deleteEventFromFirebase(id);
    if (success) {
      setEvents(events.filter(event => event.id !== id));
    } else {
      setError("Failed to delete event");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Upcoming Events</h1>
        <button 
          onClick={() => setShowForm(!showForm)}
          disabled={isUploading}
          className="flex items-center gap-1 bg-blue-600 text-white px-3 py-1 rounded-md hover:bg-blue-700 disabled:bg-gray-400"
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
              className="w-full p-2 border rounded text-gray-700"
              required
            />
            <input
              type="text"
              value={newEvent.date}
              onChange={(e) => setNewEvent({...newEvent, date: e.target.value})}
              placeholder="Date (e.g., June 1, 2024)"
              className="w-full p-2 border rounded text-gray-700"
              required
            />
            <input
              type="text"
              value={newEvent.description}
              onChange={(e) => setNewEvent({...newEvent, description: e.target.value})}
              placeholder="Description/Location"
              className="w-full p-2 border rounded text-gray-700"
            />
          </div>

          {uploadProgress > 0 && (
            <div className="pt-2">
              <div className="flex justify-between mb-1">
                <span className="text-sm font-medium text-blue-600">Uploading...</span>
                <span className="text-sm font-medium text-blue-600">{uploadProgress.toFixed(1)}%</span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full">
                <div
                  className="h-2 bg-blue-600 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
            </div>
          )}

          {error && (
            <div className="p-2 text-sm text-red-700 bg-red-100 rounded-lg">
              {error}
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={handleAddEvent}
              disabled={!newEvent.title || !newEvent.date || isUploading}
              className="bg-green-600 text-white px-3 py-1 rounded-md hover:bg-green-700 disabled:bg-gray-400"
            >
              {isUploading ? "Saving..." : "Save Event"}
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="bg-gray-500 text-white px-3 py-1 rounded-md hover:bg-gray-600"
              disabled={isUploading}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="text-center py-4">
          <p className="text-gray-500">Loading events...</p>
        </div>
      ) : events.length === 0 ? (
        <div className="text-center py-4">
          <p className="text-gray-500">No upcoming events scheduled</p>
        </div>
      ) : (
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
      )}
    </div>
  );
};

export default UpcomingEvents;