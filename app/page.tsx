"use client";

import { useSession, signIn, signOut } from "next-auth/react";
import { useState, useEffect } from "react";

export default function HomePage() {
  const { data: session, status, update } = useSession();
  const [automationEnabled, setAutomationEnabled] = useState(false);
  const [loading, setLoading] = useState(false);

  // Load automation status when session loads
  useEffect(() => {
    if (session?.user?.automationEnabled !== undefined) {
      setAutomationEnabled(session.user.automationEnabled);
    }
  }, [session]);

  const toggleAutomation = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/toggle-automation", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ enabled: !automationEnabled }),
      });

      if (response.ok) {
        setAutomationEnabled(!automationEnabled);
        // Update the session to reflect new status
        await update();
      } else {
        console.error("Failed to toggle automation");
      }
    } catch (error) {
      console.error("Error toggling automation:", error);
    }
    setLoading(false);
  };

  if (status === "loading") {
    return <div className="p-8">Loading...</div>;
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full space-y-8">
          <div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
              AV Equipment Automation
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              Sign in with Google to manage your email automation
            </p>
          </div>
          <button
            onClick={() => signIn("google")}
            className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Sign in with Google
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="border-4 border-dashed border-gray-200 rounded-lg p-8">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  AV Equipment Email Automation
                </h1>
                <p className="text-gray-600">Welcome, {session.user.email}</p>
              </div>
              <button
                onClick={() => signOut()}
                className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded"
              >
                Sign Out
              </button>
            </div>

            <div className="bg-white shadow rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-medium text-gray-900">
                    Email Automation
                  </h2>
                  <p className="text-sm text-gray-500">
                    {automationEnabled
                      ? "Automation is active - AI will respond to incoming emails"
                      : "Automation is disabled - emails will not be processed"}
                  </p>
                </div>
                <div className="flex items-center">
                  <button
                    onClick={toggleAutomation}
                    disabled={loading}
                    className={`${
                      automationEnabled ? "bg-green-600" : "bg-gray-200"
                    } relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                      loading ? "opacity-50 cursor-not-allowed" : ""
                    }`}
                  >
                    <span
                      className={`${
                        automationEnabled ? "translate-x-5" : "translate-x-0"
                      } pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200`}
                    />
                  </button>
                  <span className="ml-3 text-sm font-medium text-gray-900">
                    {automationEnabled ? "ON" : "OFF"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
