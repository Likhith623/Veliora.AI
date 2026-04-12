import React, { useState, useEffect, useRef } from "react";
import { useBot } from "@/support/BotContext";
import { useUser } from "@/support/UserContext";
import { XMarkIcon } from "@heroicons/react/24/outline"; // Using a more appropriate close icon
import { supabase } from "../../supabaseClient"; 
import { velioraClient } from "@/lib/veliora-client";


export default function Memories() {
  const [selectedCategory, setSelectedCategory] = useState("Background");
  const categoryRefs = useRef({});
  const [memories, setMemories] = useState({});
  const { userDetails } = useUser();
  const { selectedBotId } = useBot();
  const categoryOrder = [
    "Background",
    "Favorites",
    "Hopes_&_Goals",
    "Opinions",
    "Personality",
    "Temporary",
    "Reminders",
    "Others", // Updated from "Other" to match API response
  ];
  const [selectedMemory, setSelectedMemory] = useState(null); // For sidebar
  const [editText, setEditText] = useState(""); // state to control the edited text
  const [editCategories, setEditCategories] = useState([]);
  const [newMemoryText, setNewMemoryText] = useState("");
  const [isAddingNew, setIsAddingNew] = useState(false); // State to control the "Add" sidebar
  const [isEditing, setIsEditing] = useState(false); // State to control the "Edit" mode
  const [selectedMemoriesToDelete, setSelectedMemoriesToDelete] = useState([]); // Array of memory IDs to delete
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const categoryDropdownRef = useRef(null);
  const [currentMemory, setCurrentMemory] = useState(null);
  const [previousMemory, setPreviousMemory] = useState(null);


  //toggles the category dropdown while adding or editing a category
  const toggleCategoryDropdown = () => {
    setIsCategoryDropdownOpen(!isCategoryDropdownOpen);
  };

  //handles the category to be edited
  const handleEditCategorySelect = (category) => {
    setEditCategories([category]);
    setIsCategoryDropdownOpen(false);
  };

  //Sets the category for new memory
  const handleCategorySelect = (category) => {
    setSelectedCategory(category);
    setIsCategoryDropdownOpen(false);
  };

  useEffect(() => {
    // Function to handle clicks outside the category dropdown
    const handleClickOutside = (event) => {
      // Check if the dropdown exists and the click target is *not* inside it
      if (
        categoryDropdownRef.current &&
        !categoryDropdownRef.current.contains(event.target)
      ) {
        // If clicked outside, close the dropdown
        setIsCategoryDropdownOpen(false);
      }
    };
    // event listener to detect mouse clicks anywhere on the document
    document.addEventListener("mousedown", handleClickOutside);
    // Cleanup function to remove the event listener when the component unmounts
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [categoryDropdownRef]);

  //Fetches memories when the component mounts
  useEffect(() => {
    const fetchMemories = async () => {
      if (!userDetails?.email || !selectedBotId) return;
  
      const categorizedMemories = {};
      categoryOrder.forEach((category) => {
        categorizedMemories[category] = [];
      });
  
      try {
        // 1. Fetch memories from API
        const data = await velioraClient.getMemories(userDetails.email, selectedBotId);
        console.log("Memories API Response:", data);
        const categoryMap = {
          "background": "Background",
          "favorites": "Favorites",
          "hopes_and_goals": "Hopes_&_Goals",
          "opinions": "Opinions",
          "personality": "Personality",
          "relationships": "Others",
          "routines": "Others",
          "fears": "Others",
          "general": "Others"
        };

        data.forEach((memory) => {
          const rawCat = memory.category || "Others";
          const category = categoryMap[rawCat.toLowerCase()] || (categoryOrder.includes(rawCat) ? rawCat : "Others");
          const updatedText = memory.memory.replace(
            /User1/g,
            userDetails?.name || "User"
          );
          if (!categorizedMemories[category]) {
            categorizedMemories[category] = [];
          }
          categorizedMemories[category].push({
            id: memory.id,
            text: updatedText,
            categories: [category],
            relation_id: memory.relation_id,
            created_at: memory.created_at,
          });
        });
      } catch (error) {
        console.error("Error fetching API memories:", error);
      }
  
      try {
        // 2. Fetch delta memories from Supabase
        const { data: deltaData, error } = await supabase
          .from("delta_category")
          .select("*")
          .eq("email", userDetails.email)
          .eq("bot_id", selectedBotId)
          .order("timestamp", { ascending: true });
  
        if (error) throw error;
  
        deltaData.forEach((item) => {
          const cat = item.category || "Others";
          const formatted = {
            id: `delta-${item.id}`,
            text: `Δ ${item.output}`,
            categories: [cat],
            relation: item.relation,
            created_at: item.timestamp,
          };
          categorizedMemories[cat].push(formatted);
        });
      } catch (err) {
        console.error("Error fetching delta results:", err);
      }
  
      // 3. Finally, update state
      setMemories(categorizedMemories);
    };
  
    fetchMemories();
  }, [userDetails?.email, selectedBotId]);
  

  //Scrolls to the selected category
  const scrollToCategory = (category) => {
    setSelectedCategory(category);
    categoryRefs.current[category]?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  //Replacing underscores with space
  const replaceUnderscoreWithSpace = (sentence) => {
    return sentence.replace(/_/g, " ");
  };

  //Replacing 'user' with the username
  function replaceUser(sentence, name) {
    if (!name) return sentence;
    const escapedName = name.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
    const nameRegex = new RegExp(`\\b${escapedName}\\b`, "i");
    if (nameRegex.test(sentence)) {
      return sentence;
    }
    return sentence.replace(/\bUser\b/g, name);
  }

  //Sets the clicked memory to selectedMemory
  const handleMemoryClick = (memory, category) => {
    if (isEditing) {
      handleSelectMemoryToDelete(memory.id);
    } else {
      setPreviousMemory(currentMemory); // update previous
      setCurrentMemory(memory);         // set new current
  
      setSelectedMemory(memory);
      setEditText(memory.text);
      setEditCategories(memory.categories || [category]);
    }
  };
  

  //Closes the add and edit sidebar
  const handleCloseSidebar = () => {
    setSelectedMemory(null);
    setIsAddingNew(false);
  };

  //Opens the add and edit sidebar
  const handleOpenAddSidebar = () => {
    setIsAddingNew(true);
    setNewMemoryText("");
    setSelectedCategory("Category"); // Placeholder for category selection
  };

  //Saves new memory which was created by adding new memory
  const handleSaveNewMemory = async () => {
    // Prevent saving if memory text is empty or no category is selected
    if (!newMemoryText.trim() || selectedCategory === "Category") {
      return;
    }

    try {
      // Updated payload structure for add_persona endpoint
      const payload = {
        email: userDetails.email,
        bot_id: selectedBotId,
        memory: newMemoryText,
        category: selectedCategory,
        redundant: false,
      };

      // Send a POST request to the backend to add the new memory using add_persona endpoint
      const data = await velioraClient.addMemory(payload);
      console.log("Add Persona Response:", data);

      if (data.success && data.inserted && data.inserted.length > 0) {
        const insertedMemory = data.inserted[0];

        // Create memory object from response data
        const newMemory = {
          id: insertedMemory.id,
          text: insertedMemory.memory,
          categories: [insertedMemory.category],
          relation_id: insertedMemory.relation_id,
          created_at: insertedMemory.created_at,
        };

        // Update the local `memories` state by appending the new memory
        const updatedMemories = { ...memories };
        if (updatedMemories[selectedCategory]) {
          updatedMemories[selectedCategory].push(newMemory);
        } else {
          updatedMemories[selectedCategory] = [newMemory];
        }

        // Set the updated memories state
        setMemories(updatedMemories);
      }

      // Reset input fields and state after successful addition
      setIsAddingNew(false);
      setNewMemoryText("");
      setSelectedCategory("Background"); // Reset selected category
    } catch (error) {
      console.error("Error adding memory:", error);
    }
  };

  //Saves the memory which has been edited
  const handleSaveEditedMemory = async () => {
    if (!editText.trim()) {
      return;
    }

    //Payload to be sent to update memory api
    try {
      const payload = {
        memory: editText,
        category: editCategories[0],
      };
      console.log("Sending update payload:", payload);
      const memoryIdToUpdate = selectedMemory.id; // Get the memory ID
      const data = await velioraClient.updateMemory(memoryIdToUpdate, payload);
      console.log("Update API Success Response:", data);

      // Optimistically update the local state (memories) to reflect the changes.
      const updatedMemories = { ...memories };

      // Remove the memory from old category
      for (const cat in updatedMemories) {
        if (updatedMemories[cat]) {
          updatedMemories[cat] = updatedMemories[cat].filter(
            (mem) => mem.id !== selectedMemory.id
          );
        }
      }

      // Add the updated memory to its new categories.
      editCategories.forEach((cat) => {
        // If the category doesn't exist in our local state yet, create an empty array for it.
        if (!updatedMemories[cat]) {
          updatedMemories[cat] = [];
        }
        // Push the updated memory object into the array of the new category.
        updatedMemories[cat].push({
          id: selectedMemory.id,
          text: editText,
          categories: editCategories,
          relation_id: selectedMemory.relation_id,
          created_at: selectedMemory.created_at,
        });
      });
      // Update the local state with the modified memories object.
      setMemories(updatedMemories);
      setSelectedMemory(null);
      setEditText("");
      setEditCategories([]);
    } catch (error) {
      // Handle any errors that occurred during the API call or local state update.
      console.error("Error saving memory:", error);
    }
  };

  // Enables editing mode by setting the state to true
  const handleStartEdit = () => {
    setIsEditing(true);
  };

  // Disables editing mode and clears any selected memories marked for deletion
  const handleCancelEdit = () => {
    setIsEditing(false);
    setSelectedMemoriesToDelete([]);
  };

  const handleSelectMemoryToDelete = (memoryId) => {
    // Check if the provided memoryId is already present in the selectedMemoriesToDelete array.
    if (selectedMemoriesToDelete.includes(memoryId)) {
      // If the memoryId exists, it means the user is unselecting it for deletion.
      // Create a new array by filtering out the memoryId from the existing selectedMemoriesToDelete array.
      setSelectedMemoriesToDelete(
        selectedMemoriesToDelete.filter((id) => id !== memoryId)
      );
    } else {
      // If the memoryId does not exist, it means the user is selecting it for deletion.
      // Create a new array by spreading the existing selectedMemoriesToDelete array
      // and adding the new memoryId to the end. This ensures immutability of the state.
      setSelectedMemoriesToDelete([...selectedMemoriesToDelete, memoryId]);
    }
  };

  const handleDeleteSingleMemory = async () => {
    // Check if a memory is currently selected for deletion. If not, exit the function.
    if (!selectedMemory) return;

    try {
      const memoryIdToDelete = selectedMemory.id;
      await velioraClient.deleteMemory(memoryIdToDelete);

      // If the deletion was successful, update the local state to reflect the change.
      const updatedMemories = { ...memories };
      for (const category in updatedMemories) {
        if (updatedMemories.hasOwnProperty(category)) {
          updatedMemories[category] = updatedMemories[category].filter(
            (mem) => mem.id !== selectedMemory.id
          );
        }
      }
      setMemories(updatedMemories);
      setSelectedMemory(null);
    } catch (error) {
      console.error("Error deleting memory:", error);
    }
  };

  const handleDeleteSelectedMemories = async () => {
    // Check if there are any memories selected for deletion. If not, exit the function.
    if (selectedMemoriesToDelete.length === 0) return;

    try {
      // Loop through the array of selected memory IDs
      for (const memoryIdToDelete of selectedMemoriesToDelete) {
        try {
          await velioraClient.deleteMemory(memoryIdToDelete);
          console.log(`Deleting memory ID: ${memoryIdToDelete} successful`);
        } catch (error) {
          console.error(`Failed to delete memory ID: ${memoryIdToDelete}`, error);
          continue;
        }
      }

      // After attempting to delete all selected memories, update the local state
      const updatedMemories = { ...memories };
      for (const category in updatedMemories) {
        if (updatedMemories.hasOwnProperty(category)) {
          updatedMemories[category] = updatedMemories[category].filter(
            (mem) => !selectedMemoriesToDelete.includes(mem.id)
          );
        }
      }
      setMemories(updatedMemories);
      setSelectedMemoriesToDelete([]);
      setIsEditing(false);
    } catch (error) {
      console.error("Error deleting memories:", error);
    }
  };
   //Fetching The Delta Categorizer memory

  const getDeltaFromBackend = async (inputData) => {
    try {
      const response = await fetch("http://127.0.0.1:8000/delta", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(inputData),
      });
  
      const result = await response.json();
      return result.delta;
    } catch (error) {
      console.error("Error fetching delta:", error);
      return null;
    }
  };
  const [delta, setDelta] = useState(null);

  useEffect(() => {
    if (currentMemory && previousMemory) {
      const inputData = {
        user_input: currentMemory.text,
        previous_input: previousMemory.text,
      };
      getDeltaFromBackend(inputData).then(setDelta);
    }
  }, [currentMemory, previousMemory]);
  

  return (
    <div className="flex flex-col md:flex-row h-full p-4 md:p-6 rounded-xl shadow-2xl bg-white dark:bg-black">
      {/* Left Panel - Categories */}
      <div className="w-full md:w-1/3 lg:w-1/4 p-4 md:p-6">
        <h1 className="text-lg md:text-2xl font-bold mb-4 md:mb-6 text-gray-800 dark:text-white">
          Memory
        </h1>
        {/* Horizontal scrollable categories on mobile, vertical on larger screens */}
        <div className="flex flex-row scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-gray-100 dark:scrollbar-track-gray-800 overflow-x-auto md:flex-col md:space-y-2 mt-8 sm:mt-12">
          {/* Map through the categoryOrder array to display category buttons */}
          {categoryOrder.map((category) => (
            <button
              key={category}
              onClick={() => scrollToCategory(category)}
              className={`text-sm md:text-base text-left px-3 py-3 md:px-4 md:py-3 rounded-lg transition-all font-bold duration-300 whitespace-nowrap ${
                selectedCategory === category
                  ? "text-gray-800 dark:text-white bg-gray-100 dark:bg-gray-800 font-bold"
                  : "hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300"
              }`}
              style={{ width: "auto" }} // Override w-full for mobile
            >
              {replaceUnderscoreWithSpace(category)}{" "}
              {/* Display category name with spaces */}
            </button>
          ))}
        </div>
      </div>

      {/* Right Panel - API Fetched Memories */}
      <div className="w-full md:w-2/3 lg:w-3/4 flex flex-col p-4 md:p-6 overflow-hidden">
        {/* Fixed Top Buttons for Add and Edit */}
        <div className="flex items-center justify-end mb-8 mr-12">
          {/* Display Add and Edit buttons when not in editing mode */}
          {!isEditing && (
            <>
              <button
                onClick={handleOpenAddSidebar}
                className="text-gray-800 dark:text-white bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 mr-2 rounded-3xl px-8 py-2"
              >
                Add
              </button>
              <button
                onClick={handleStartEdit}
                className="text-gray-800 dark:text-white bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-3xl px-8 py-2"
              >
                Edit
              </button>
            </>
          )}

          {/* Display Delete and Cancel buttons when in editing mode */}
          {isEditing && (
            <>
              <button
                onClick={handleDeleteSelectedMemories}
                disabled={selectedMemoriesToDelete.length === 0}
                className={`rounded-3xl px-6 py-2 text-white hover:bg-red-700 dark:hover:bg-red-700 font-semibold ${
                  selectedMemoriesToDelete.length > 0
                    ? "bg-red-500 dark:bg-red-600"
                    : "bg-gray-300 dark:bg-gray-600 cursor-not-allowed"
                } transition-colors mr-2`}
              >
                Delete
              </button>
              <button
                onClick={handleCancelEdit}
                className="text-gray-800 dark:text-white bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-3xl px-6 py-2"
              >
                Cancel
              </button>
            </>
          )}
        </div>

        {/* Scrollable Memories Content */}
        <div className="overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-gray-100 dark:scrollbar-track-gray-800">
          <div className="space-y-6 md:space-y-8 mt-2">
            {/* Map through the categoryOrder again to display memories under each category */}
            {categoryOrder.map((category) => (
              <div
                key={category}
                ref={(el) => (categoryRefs.current[category] = el)}
                className="relative p-4 rounded-xl"
              >
                <div>
                  <h2>Output:</h2>
                  <pre>{JSON.stringify(delta, null, 2)}</pre>
                </div>
                <h2 className="text-sm sm:text-base md:text-base font-semibold text-gray-800 dark:text-white mb-3 md:mb-4">
                  {replaceUnderscoreWithSpace(category)}{" "}
                  {/* Display category title */}
                </h2>
                <div className="space-y-2 md:space-y-3">
                  {/* Check if there are memories for the current category */}
                  {memories[category]?.length > 0 ? (
                    // Map through the memories for the current category
                    memories[category].map((memory) => (
                      <div
                        key={memory.id}
                        onClick={() => handleMemoryClick(memory, category)}
                        className={`text-sm sm:text-base md:text-base p-3 md:p-4 rounded-lg bg-gray-100 dark:bg-gray-900 font-bold hover:bg-gray-200 dark:hover:bg-gray-800 transition-all duration-300 text-gray-800 dark:text-white flex items-center justify-between cursor-pointer ${
                          isEditing &&
                          selectedMemoriesToDelete.includes(memory.id)
                            ? "bg-red-200 dark:bg-red-900"
                            : ""
                        }`}
                      >
                        <span>
                          {replaceUser(memory.text, userDetails?.name)}
                        </span>
                        {/* Checkbox for selecting memories in edit mode */}
                        {isEditing && (
                          <div className="relative mr-2">
                            <input
                              type="checkbox"
                              checked={selectedMemoriesToDelete.includes(
                                memory.id
                              )}
                              onChange={() =>
                                handleSelectMemoryToDelete(memory.id)
                              }
                              className="opacity-0 absolute inset-0 w-5 h-5 cursor-pointer" // Hide default checkbox
                            />
                            {/* Custom checkbox styling */}
                            <div
                              className={`w-5 h-5 rounded-md border-2 border-gray-400 transition-all duration-200 flex items-center justify-center ${
                                selectedMemoriesToDelete.includes(memory.id)
                                  ? "bg-gray-400/40 "
                                  : "bg-white/10"
                              }`}
                            >
                              {/* Checkmark icon when checked */}
                              {selectedMemoriesToDelete.includes(memory.id) && (
                                <svg
                                  className="w-3 h-3 text-white fill-current"
                                  viewBox="0 0 20 20"
                                >
                                  <path
                                    fillRule="evenodd"
                                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                    clipRule="evenodd"
                                  />
                                </svg>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="text-sm sm:text-base md:text-base"></p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Add sidebar - displayed when isAddingNew is true */}
      {isAddingNew && (
        <div className="fixed inset-0 z-50 flex justify-end p-8 backdrop-blur-md">
          {/* Overlay behind the sidebar */}
          <div
            className={`hidden md:absolute inset-0 bg-black/30 backdrop-blur-xl transition-opacity duration-700 ease-in-out ${
              isAddingNew
                ? "opacity-100 pointer-events-auto"
                : "opacity-0 pointer-events-none"
            }`}
            onClick={handleCloseSidebar}
          />

          {/* Sidebar content for adding new memories */}
          <div
            className={`relative h-full max-h-[calc(100vh - 64px)] w-full sm:w-96 bg-gray-300 shadow-xl z-50 rounded-3xl overflow-hidden backdrop-blur-3xl transition-transform duration-700 ease-in-out transform ${
              isAddingNew ? "translate-x-0" : "translate-x-full"
            }`}
          >
            <div className="p-10 flex flex-col h-full text-white">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg md:text-2xl font-bold text-gray-700">
                  Add
                </h2>
                <button
                  onClick={handleCloseSidebar}
                  className="text-gray-700 hover:text-white transition"
                >
                  <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                </button>
              </div>
              {/* Category dropdown for adding new memory */}
              <div className="mb-6">
                <label
                  htmlFor="newCategory"
                  className="block text-sm font-medium text-gray-300"
                ></label>
                <div className="relative" ref={categoryDropdownRef}>
                  <button
                    type="button"
                    onClick={toggleCategoryDropdown}
                    className="w-full py-5 pl-4 pr-5 mt-1 px-3 text-sm md:text-base bg-white/30 rounded-xl sm:text-sm text-left font-semibold text-gray-700 shadow-inner flex items-center justify-between"
                  >
                    {selectedCategory === "Category"
                      ? "Category"
                      : replaceUnderscoreWithSpace(selectedCategory)}
                    <svg
                      className={`w-5 h-5 ml-2 inline-block transform ${
                        isCategoryDropdownOpen ? "-rotate-180" : ""
                      }`}
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      aria-hidden="true"
                    >
                      <path
                        fillRule="evenodd"
                        d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                  {/* Category dropdown options */}
                  {isCategoryDropdownOpen && (
                    <div className="absolute left-0 mt-2 w-full rounded-2xl shadow-lg z-10 bg-black/20 backdrop-blur-md border border-white/10 overflow-hidden">
                      {categoryOrder.map((cat) => (
                        <button
                          key={cat}
                          onClick={() => {
                            setSelectedCategory(cat);
                            setIsCategoryDropdownOpen(false);
                          }}
                          className={`w-full text-sm md:text-base text-left px-4 py-3 hover:bg-white/10 text-white font-bold transition-colors duration-200 ${
                            selectedCategory === cat ? "bg-white/20" : ""
                          }`}
                        >
                          {replaceUnderscoreWithSpace(cat)}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              {/* Textarea for entering new memory text */}
              <div className="mb-6">
                <label
                  htmlFor="newMemoryText"
                  className="block text-sm font-medium text-gray-200"
                ></label>
                <textarea
                  id="newMemoryText"
                  value={newMemoryText}
                  onChange={(e) => setNewMemoryText(e.target.value)}
                  placeholder="Ex.: saniya likes..."
                  className="mt-1 block w-full p-4 rounded-2xl text-gray-700 bg-white/30 sm:text-sm resize-none flex-grow scrollbar-thin scrollbar-thumb-gray-100 scrollbar-track-gray-100 overflow-y-auto"
                  style={{ minHeight: "150px" }} // Increased height
                />
                <p className="text-xs text-gray-700 mt-4">
                  Always use your name or pronouns.
                </p>
              </div>
              {/* Save button for adding new memory */}
              <div className="flex justify-center mt-auto">
                <button
                  onClick={handleSaveNewMemory}
                  disabled={
                    selectedCategory === "Category" || !newMemoryText.trim()
                  }
                  className={`px-6 py-2 rounded-xl text-gray-700 font-semibold transition-colors ${
                    selectedCategory !== "Category" && newMemoryText.trim()
                      ? "bg-white  text-gray-700 hover:bg-gray-400 hover:text-white"
                      : "bg-white/70 text-gray-700 cursor-not-allowed"
                  }`}
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sidebar - Edit/Delete Memory - displayed when selectedMemory is true and not adding new */}
      {!isAddingNew && selectedMemory && (
        <div className="fixed inset-0 z-50 flex justify-end p-8">
          {/* Overlay behind the edit/delete sidebar */}
          <div
            className={`absolute inset-0 bg-black/30 backdrop-blur-xl transition-opacity duration-700 ease-in-out hidden md:flex ${
              !isAddingNew && selectedMemory
                ? "opacity-100 pointer-events-auto"
                : "opacity-0 pointer-events-none"
            }`}
            onClick={handleCloseSidebar}
          />
          {/* Sidebar Content */}
          <div
            className={`relative h-full max-h-[calc(100vh - 64px)] w-full sm:w-96 bg-gray-300 shadow-xl z-50 rounded-3xl overflow-hidden backdrop-blur-3xl transition-transform duration-300 ease-in-out transform ${
              !isAddingNew && selectedMemory
                ? "translate-x-0"
                : "translate-x-full"
            }`}
          >
            <div className="p-10 flex flex-col h-full text-gray-700">
              <div className="flex justify-between items-center mb-4 ">
                <h2 className="text-lg md:text-xl text-center font-semibold text-[#36454f]">
                  Edit
                </h2>
                <button
                  onClick={handleCloseSidebar}
                  className=" text-gray-500 hover:text-gray-700"
                >
                  <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                </button>
              </div>
              {/* Category dropdown for editing memory */}
              <div className="mb-6 mt-4">
                <div className="relative" ref={categoryDropdownRef}>
                  <button
                    type="button"
                    onClick={toggleCategoryDropdown}
                    className="w-full py-5 pl-4 pr-5 mt-1 px-3 bg-white/30 rounded-xl sm:text-sm text-left font-semibold text-gray-700 shadow-inner flex items-center justify-between"
                  >
                    <span>
                      {replaceUnderscoreWithSpace(editCategories[0]) ||
                        "Select a category"}
                    </span>
                    <svg
                      className={`w-5 h-5 transform ${
                        isCategoryDropdownOpen ? "-rotate-180" : ""
                      }`}
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      aria-hidden="true"
                    >
                      <path
                        fillRule="evenodd"
                        d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                  {isCategoryDropdownOpen && (
                    <div className="absolute left-0 mt-2 w-full rounded-2xl shadow-lg z-10 bg-black/20 backdrop-blur-md border border-white/10 overflow-hidden">
                      {categoryOrder.map((cat) => (
                        <button
                          key={cat}
                          onClick={() => handleEditCategorySelect(cat)}
                          className={`w-full text-sm text-left px-4 py-3 hover:bg-white/10 text-white font-semibold transition-colors duration-200 ${
                            editCategories[0] === cat ? "bg-white/20" : ""
                          }`}
                        >
                          {replaceUnderscoreWithSpace(cat)}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              {/* Textarea for editing text */}
              <div className="mb-6 mt-2">
                <textarea
                  id="editText"
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  className="mt-1 block w-full p-4 rounded-2xl text-gray-700 bg-white/30 sm:text-sm resize-none flex-grow scrollbar-thin scrollbar-thumb-gray-100 scrollbar-track-gray-100 overflow-y-auto"
                  style={{ minHeight: "150px" }} // Increased height
                />
                <p className="text-xs text-gray-500 mt-4">
                  Always use your name or pronouns.
                </p>
              </div>

              <div className="flex justify-center space-x-2 mt-auto">
                <button
                  onClick={handleSaveEditedMemory}
                  className="px-4 py-2 rounded-2xl bg-white/40 text-gray-700 font-semibold hover:bg-gray-400 hover:text-white transition-colors"
                >
                  Save
                </button>
                <button
                  onClick={handleDeleteSingleMemory}
                  className="px-4 py-2 rounded-2xl bg-white/40 text-gray-700 font-semibold hover:bg-gray-400 hover:text-white transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
