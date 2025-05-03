"use client";

import { useState, useEffect } from "react";
import { ref, listAll, deleteObject, getStorage } from "firebase/storage";
import {
  getFirestore,
  collection,
  getDocs,
  deleteDoc,
  query,
  orderBy,
  doc,
} from "firebase/firestore";
import { FaTrash } from "react-icons/fa";
import Image from "next/image";
import { useRouter } from "next/navigation";

const storage = getStorage();
const firestore = getFirestore();

interface ParagraphItem {
  title: string;
  description: string[];
}

interface ContentData {
  name: string;
  description: string[];
  paragraphs: ParagraphItem[];
  content_image?: string;
  category: "hajj" | "umrah" | "madina";
}

type TabType = "hajj" | "umrah" | "madina";

interface ContentItem {
  id: string;
  name: string;
  content_image?: string;
  timestamp: string;
  category: TabType;
  folderId: number;
  files?: string[];
  images?: string[];
  audios?: string[];
  description?: string[];
  paragraphs?: ParagraphItem[];
}

interface ContentListProps {
  activeTab: TabType;
}

const ContentList = ({ activeTab }: ContentListProps) => {
  const router = useRouter();
  const [contentList, setContentList] = useState<ContentItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [error, setError] = useState("");

  // Load content when tab changes
  useEffect(() => {
    loadContentForTab(activeTab);
  }, [activeTab]);

  // Load content for the selected tab
  const loadContentForTab = async (tabType: TabType) => {
    try {
      setIsLoading(true);
      const collectionName = `${tabType}_uploads`;
      const contentCollection = collection(firestore, collectionName);
      const contentQuery = query(
        contentCollection,
        orderBy("timestamp", "desc")
      );
      const querySnapshot = await getDocs(contentQuery);

      const items: ContentItem[] = [];
      for (const doc of querySnapshot.docs) {
        const data = doc.data() as ContentData & {
          timestamp: string;
          folderId: number;
        };

        items.push({
          id: doc.id,
          name: data.name,
          content_image: data.content_image,
          timestamp: data.timestamp,
          category: data.category,
          folderId: data.folderId,
        });
      }

      setContentList(items);
    } catch (error) {
      console.error(`Error loading ${tabType} content:`, error);
      setError(`Failed to load ${tabType} content`);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle edit button click
  const handleEditClick = (item: ContentItem) => {
    router.push(`/file?collection=${item.category}_uploads&id=${item.id}`);
  };

  // Delete content
  const handleDeleteItem = async (
    itemId: string,
    folderId: number,
    category: TabType
  ) => {
    if (deleteConfirm === itemId) {
      try {
        setIsLoading(true);

        // Delete from Firestore
        const collectionName = `${category}_uploads`;
        await deleteDoc(doc(firestore, collectionName, itemId));

        // Delete folder from Storage
        const folderRef = ref(storage, `${category}/${folderId}`);
        try {
          const folderContents = await listAll(folderRef);

          // Delete all files in the folder
          const deletePromises = folderContents.items.map((item) =>
            deleteObject(item)
          );
          await Promise.all(deletePromises);

          // Delete all prefixes (sub-folders) if any
          const prefixPromises = folderContents.prefixes.map(async (prefix) => {
            const prefixContents = await listAll(prefix);
            const prefixDeletePromises = prefixContents.items.map((item) =>
              deleteObject(item)
            );
            await Promise.all(prefixDeletePromises);
          });
          await Promise.all(prefixPromises);
        } catch (storageError) {
          console.error("Error deleting storage files:", storageError);
          // Continue anyway to update the UI
        }

        // Update UI by removing the deleted item
        setContentList((prevList) =>
          prevList.filter((item) => item.id !== itemId)
        );
        setDeleteConfirm(null);
        setError("");
      } catch (error) {
        console.error("Error deleting content:", error);
        setError("Failed to delete content");
      } finally {
        setIsLoading(false);
      }
    } else {
      // Set confirmation state
      setDeleteConfirm(itemId);
    }
  };

  return (
    <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-gray-700">
          {activeTab === "hajj"
            ? "Hajj"
            : activeTab === "umrah"
            ? "Umrah"
            : "Madina"}{" "}
          Content List
        </h2>
      </div>

      {isLoading ? (
        <div className="text-center py-10">
          <p className="text-gray-500">Loading content...</p>
        </div>
      ) : contentList.length === 0 ? (
        <div className="text-center py-10">
          <p className="text-gray-500">No content found.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {contentList.map((item) => (
            <div key={item.id} className="border rounded-lg overflow-hidden">
              <div className="flex items-start p-4">
                {item.content_image && (
                  <div className="flex-shrink-0 mr-4">
                    <Image
                      src={item.content_image}
                      alt={item.name}
                      width={100}
                      height={100}
                      className="object-cover w-24 h-24 rounded-md"
                    />
                  </div>
                )}
                <div className="h-full flex-grow flex flex-col justify-between">
                  <h3 className="font-medium text-lg text-gray-800 line-clamp-2">
                    {item.name}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {new Date(item.timestamp).toLocaleDateString()} - ID:{" "}
                    {item.folderId}
                  </p>
                </div>
                <div className="flex-shrink-0 space-x-2">
                  <button
                    onClick={() => handleEditClick(item)}
                    className="p-2 text-blue-600 hover:text-blue-800"
                    disabled={isLoading}
                  >
                    Edit
                  </button>
                  <button
                    onClick={() =>
                      handleDeleteItem(item.id, item.folderId, item.category)
                    }
                    className={`p-2 ${
                      deleteConfirm === item.id
                        ? "text-red-600"
                        : "text-gray-600 hover:text-red-600"
                    }`}
                    disabled={isLoading}
                  >
                    <FaTrash size={18} />
                  </button>
                </div>
              </div>

              {/* Delete confirmation */}
              {deleteConfirm === item.id && (
                <div className="bg-red-50 p-3 flex justify-between items-center">
                  <p className="text-red-700 text-sm">
                    Confirm deletion? This cannot be undone.
                  </p>
                  <div className="space-x-2">
                    <button
                      onClick={() =>
                        handleDeleteItem(item.id, item.folderId, item.category)
                      }
                      className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                    >
                      Delete
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(null)}
                      className="px-3 py-1 bg-gray-200 text-gray-800 text-sm rounded hover:bg-gray-300"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {error && (
        <div
          className="p-4 text-sm text-red-700 bg-red-100 rounded-lg mt-4"
          role="alert"
        >
          {error}
        </div>
      )}
    </div>
  );
};

export default ContentList;
