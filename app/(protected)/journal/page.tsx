import React from "react";
import MainLayout from "@/components/MainLayout";

export default function JournalPage() {
  return (
    <MainLayout>
      <div className="p-4 md:p-8">
        <h1 className="text-2xl md:text-3xl font-bold mb-4">Daily Journal</h1>
        <p className="text-muted-foreground mb-6">
        Log your food intake, water intake, and calories burned or added here.
        </p>
        <div className="space-y-4">
          {/* Add your journal components here */}
          <div className="p-4 border rounded-md bg-card">
            <h2 className="text-lg font-medium">Journal Entry</h2>
            <p className="text-sm text-muted-foreground">
              Start writing your thoughts for the day...
            </p>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}