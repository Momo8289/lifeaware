'use client';

import { Button } from "@/components/ui/button";
import {Card} from "@/components/ui/card";
import Link from "next/link";
import JournalDashboard from "@/components/journal/JournalDashboard";
import CaloriesToday from "@/components/journal/CaloriesToday";
import WaterDrunk from "@/components/journal/WaterDrunk";


export default function JournalPage() {
  return (
  <>
    <div className="container py-6">
    <div className="flex justify-between">
      <h1 className="text-3xl font-bold">My Journal</h1>
      <Link href="/journal/new">
        <Button>+ New Journal Entry</Button>
    </Link>
      </div>
    </div>
 <JournalDashboard />
 <div className= "grid grid-cols-1 md:grid-cols-3 gap-4">
 <Card className="caloriesRadial">
  <CaloriesToday />
 </Card>
 <Card className="text-center p-7  border-white border-solid border-2">???</Card>
 <Card className="waterRadial">
  <WaterDrunk/>
 </Card>
 </div>
 
  </>
     
  );
}