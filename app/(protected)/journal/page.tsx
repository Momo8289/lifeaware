'use client';

import { Button } from "@/components/ui/button";
import {Card} from "@/components/ui/card";
import Link from "next/link";

//this will likely be mostly replaced 
export function StatsTimeline (){
return (
    <div className="container border-white border-solid border-2 h-36 flex justify-center p-7">
    <p>timeline of food eaten will go here</p>
    </div>
)
};

export function MacrosDashboard (){
    return (
        <div className="container border-white border-solid border-2 h-36 flex justify-center p-7">
        <p>Macro nutrient breakdown displayed here</p>
        </div>
    )
}

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
 <StatsTimeline/>
 <div className= "grid grid-cols-1 md:grid-cols-3 gap-4">
 <Card className="text-center p-7  border-white border-solid border-2">Calories</Card>
 <Card className="text-center p-7  border-white border-solid border-2">???</Card>
 <Card className=" text-center p-7  border-white border-solid border-2">Water Drunk</Card>
 </div>
 <MacrosDashboard/>
  </>
     
  );
}