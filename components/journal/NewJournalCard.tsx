//card for creating new entry here
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select,  SelectContent, SelectItem, SelectTrigger, SelectValue, } from "../ui/select";

function NewJournalCard(){
    return(
<>
<Card>
    <CardHeader><CardTitle>New Food Journal Entry</CardTitle></CardHeader>
    <CardContent>
        <form>
            <div className ="flex justify-evenly">
                <Select>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder ="Which meal are you logging?" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="breakfast">Breakfast</SelectItem>
                        <SelectItem value="lunch">Lunch</SelectItem>
                        <SelectItem value="dinner">Dinner</SelectItem>
                        <SelectItem value="snack">Snack</SelectItem>
                    </SelectContent>
                </Select>
        
            <input type ="datetime-local"></input>
            </div>
            <div className="flex justify-evenly mt-10">
            <label>Meal:
                <Select>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder ="What did you eat?" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="placeHolder">Use API to search food databases</SelectItem>
                     
                    </SelectContent>
                </Select>
            </label>
            <Button>Save Meal</Button>
            </div>
        </form>
    </CardContent>

</Card>
</>
    );

}

export default NewJournalCard;