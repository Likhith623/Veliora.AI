import React, { useState, useRef, useEffect } from "react";
import { X } from "lucide-react";
import { ArrowLeft } from "lucide-react";
import { useBot } from "@/support/BotContext";
import { useTraits } from "@/support/TraitsContext";
import { useUser } from "@/support/UserContext";
import { ChevronDown, ChevronUp } from "lucide-react";
// Diary now reads from new backend: GET /api/diary/{bot_id}
import { diaryGetEntries, diaryDeleteEntry } from "@/lib/veliora-client";

function groupByMonth(summaries) {
  const grouped = {};
  summaries.forEach(({ summary_date, generated_summary }) => {
    const date = new Date(summary_date);
    const monthKey = date.toLocaleString("default", {
      month: "long",
      year: "numeric",
    });
    const dateStr = date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
    if (!grouped[monthKey]) grouped[monthKey] = [];
    grouped[monthKey].push({
      date: dateStr,
      isoDate: summary_date,
      content: generated_summary,
    });
  });
  return grouped;
}

function Diary() {
  const [summaries, setSummaries] = useState({});
  const [selectedMonth, setSelectedMonth] = useState("");
  const [selectedLog, setSelectedLog] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [selectedEntries, setSelectedEntries] = useState([]);
  const [isDetailView, setIsDetailView] = useState(false);
  const monthRefs = useRef({});
  const [loading, setLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0); //state to refrsh trigger after deletion

  const { selectedBotId } = useBot();
  const { userDetails } = useUser();

  const bot_id = selectedBotId;
  const email = userDetails.email;

  useEffect(() => {
    const fetchSummaries = async () => {
      setLoading(true);
      try {
        // New backend: GET /api/diary/{bot_id}?limit=30
        // Adapter returns { summaries: [{ summary_date, generated_summary, mood }] }
        const data = await diaryGetEntries(bot_id, 30);
        const summariesArray = data?.summaries;

        if (Array.isArray(summariesArray)) {
          const grouped = groupByMonth(summariesArray);
          setSummaries(grouped);

          if (Object.keys(grouped).length > 0) {
            const firstMonth = Object.keys(grouped)[0];
            setSelectedMonth(firstMonth);
            setSelectedLog(grouped[firstMonth]?.[0]);
          }
        } else {
          console.error(
            "API response did not contain a valid summaries array:",
            data
          );
          setSummaries({});
        }

        setLoading(false);
      } catch (err) {
        console.error("Failed to fetch summaries", err);
        setLoading(false);
      }
    };

    fetchSummaries();
  }, [email, bot_id, refreshTrigger]); //refetch the summaries if email, bot_id or refreshTrigger changes

  const handleScrollToMonth = (month) => {
    setSelectedMonth(month);
    setSelectedLog(summaries[month][0]);
    monthRefs.current[month]?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  const toggleEntrySelection = (date) => {
    setSelectedEntries((prev) =>
      prev.includes(date) ? prev.filter((d) => d !== date) : [...prev, date]
    );
  };

  const deleteSelectedEntries = async () => {
    try {
      // New backend: diaryDeleteEntry is a no-op (diary managed by server CRON)
      await Promise.all(
        selectedEntries.map((isoDate) => diaryDeleteEntry(bot_id, isoDate))
      );

      const updatedSummaries = { ...summaries };
      for (const month in updatedSummaries) {
        updatedSummaries[month] = updatedSummaries[month].filter(
          (log) => !selectedEntries.includes(log.isoDate)
        );
      }

      setSummaries(updatedSummaries);
      setSelectedEntries([]);
      setEditMode(false);

      const remainingLogs = Object.values(updatedSummaries).flat();
      if (remainingLogs.length > 0) {
        const newMonth = Object.keys(updatedSummaries).find(
          (m) => updatedSummaries[m].length > 0
        );
        setSelectedMonth(newMonth);
        setSelectedLog(updatedSummaries[newMonth][0]);
      } else {
        setSelectedMonth("");
        setSelectedLog(null);
      }
      setRefreshTrigger((prev) => prev + 1); //triggers when there is deletion of the summaries
    } catch (err) {
      console.error("Failed to delete summaries", err);
    }
  };

  if (Object.keys(summaries).length === 0) {
    return (
      <div className="h-full max-w-7xl mx-auto flex flex-col bg-white dark:bg-black">
        <div className="flex-none px-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-white">
              Diary
            </h1>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center text-gray-500 dark:text-gray-400">
          No summaries available.
        </div>
      </div>
    );
  }

  return (
    <div className="h-full max-w-7xl mx-auto p-2 bg-white dark:bg-black">
      {/* Mobile Detail View */}
      <div
        className={`fixed inset-0 bg-white dark:bg-black z-50 md:hidden ${
          isDetailView ? "block" : "hidden"
        }`}
      >
        <div className="p-4 flex items-center gap-4 border-b border-gray-200 dark:border-gray-700">
          <button onClick={() => setIsDetailView(false)}>
            <ArrowLeft className="w-5 h-5 text-gray-800 dark:text-white" />
          </button>
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
            {selectedLog?.date}
          </h2>
        </div>
        <div className="overflow-y-auto h-[calc(100%-70px)]">
          <div className="p-6">
            <p className="text-lg leading-relaxed whitespace-pre-line text-gray-800 dark:text-white">
              {selectedLog?.content}
            </p>
          </div>
        </div>
      </div>

      <div className="h-full flex flex-col overflow-hidden">
        {/* Header Section */}
        <div className="p-2 pt-4 flex-none md:px-6 md:py-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-white">
              Diary
            </h1>
            <button
              onClick={() => setEditMode(!editMode)}
              className="sm:py-2 px-6 mr-12 md:mr-20 py-2 text-md font-semibold rounded-2xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-800 dark:text-white transition-all duration-300"
            >
              {editMode ? "Cancel" : "Edit"}
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Left Panel - Diary Entries */}
          <div className="mt-4 md:mt-0 w-full md:w-2/5 lg:w-1/3 flex flex-col h-full border-r border-gray-200 dark:border-gray-700">
            <div className="p-2 flex-none md:p-6">
              <MonthDropdown
                summaries={summaries}
                selectedMonth={selectedMonth}
                handleMonthSelect={handleScrollToMonth}
              />
            </div>

            <div className="flex-1 overflow-y-auto px-2 md:px-6 pb-6">
              <div className="space-y-6">
                {Object.keys(summaries).map((month) => (
                  <div
                    key={month}
                    ref={(el) => (monthRefs.current[month] = el)}
                    className="space-y-3"
                  >
                    <h2 className="text-md font-bold text-gray-700 dark:text-gray-300 top-0 py-2">
                      {month}
                    </h2>
                    {summaries[month]?.map((log, index) => (
                      <div key={index} className="flex items-center gap-3">
                        {editMode && (
                          <div
                            className={`w-5 h-5 cursor-pointer rounded-md border-2 border-gray-300 dark:border-gray-600 transition-all duration-200 flex items-center justify-center ${
                              selectedEntries.includes(log.isoDate)
                                ? "bg-gray-200 dark:bg-gray-700"
                                : "bg-white dark:bg-gray-800"
                            }`}
                            onClick={() => toggleEntrySelection(log.isoDate)}
                          >
                            {selectedEntries.includes(log.isoDate) && (
                              <svg
                                className="w-3 h-3 text-gray-800 dark:text-white fill-current"
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
                        )}
                        <div
                          onClick={() => {
                            setSelectedLog(log);
                            setIsDetailView(true);
                          }}
                          className={`flex-1 p-3 rounded-lg cursor-pointer transition-all duration-300 ${
                            selectedLog?.isoDate === log.isoDate
                              ? "bg-gray-100 dark:bg-gray-800"
                              : "hover:bg-gray-50 dark:hover:bg-gray-800/50"
                          }`}
                        >
                          <p className="text-gray-800 dark:text-white">
                            {log.date}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>

            {editMode && (
              <div className="flex-none px-6 pb-6 pt-3 border-t border-white">
                <div className="flex gap-3">
                  <button
                    className="flex-1 px-4 py-2 text-sm font-semibold rounded-lg bg-gray-400 text-white hover:bg-gray-600 transition-colors"
                    onClick={deleteSelectedEntries}
                  >
                    Delete
                  </button>
                  <button
                    className="flex-1 px-4 py-2 text-sm font-semibold rounded-lg bg-gray-400 text-white hover:bg-gray-600 transition-colors"
                    onClick={() =>
                      setSelectedEntries(
                        Object.values(summaries)
                          .flat()
                          .map((entry) => entry.isoDate)
                      )
                    }
                  >
                    Select All
                  </button>
                  <button
                    className="flex-1 px-4 py-2 text-sm font-semibold rounded-lg bg-gray-400 text-white hover:bg-gray-600 transition-colors"
                    onClick={() => setSelectedEntries([])}
                  >
                    Deselect All
                  </button>
                </div>
              </div>
            )}
          </div>
          {/* Right Panel - Selected Diary Content */}
          <div className="hidden w-full md:w-3/5 lg:w-2/3 md:flex flex-col h-full overflow-y-auto">
            <div className="flex-1 p-6 md:p-12">
              {selectedLog ? (
                <div className="max-w-2xl">
                  <h2 className="text-3xl md:text-2xl font-bold text-gray-800 dark:text-white mb-4">
                    {selectedLog.date}
                  </h2>
                  <p className="text-md text-gray-700 dark:text-white whitespace-pre-line">
                    {selectedLog.content}
                  </p>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
                  Select a diary entry to view its content.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Diary;

function MonthDropdown({ summaries, selectedMonth, handleMonthSelect }) {
  const [isOpen, setIsOpen] = useState(false);

  const toggleOpen = () => setIsOpen(!isOpen);

  return (
    <div className="relative">
      <button
        onClick={toggleOpen}
        className="w-full flex items-center justify-between p-3 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-700 transition-all duration-300"
      >
        <span>{selectedMonth}</span>
        {isOpen ? (
          <ChevronUp className="w-5 h-5" />
        ) : (
          <ChevronDown className="w-5 h-5" />
        )}
      </button>
      {isOpen && (
        <div className="absolute z-10 w-full mt-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
          {Object.keys(summaries).map((month) => (
            <button
              key={month}
              onClick={() => {
                handleMonthSelect(month);
                setIsOpen(false);
              }}
              className={`w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-800 dark:text-white ${
                selectedMonth === month ? "bg-gray-100 dark:bg-gray-700" : ""
              }`}
            >
              {month}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
