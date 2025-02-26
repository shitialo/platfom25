import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X } from "lucide-react";

interface DateTimePickerProps {
  value: Array<{
    date: string;
    start_time: string;
    end_time: string;
    available_slots: number;
  }>;
  onChange: (value: any[]) => void;
  onRemove: (index: number) => void;
}

const DateTimePicker = ({ value, onChange, onRemove }: DateTimePickerProps) => {
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [slots, setSlots] = useState("");

  const handleAdd = () => {
    if (!date || !startTime || !endTime || !slots) return;

    const newSlot = {
      date,
      start_time: startTime,
      end_time: endTime,
      available_slots: parseInt(slots),
    };

    onChange([...value, newSlot]);
    
    // Reset form
    setDate("");
    setStartTime("");
    setEndTime("");
    setSlots("");
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          min={new Date().toISOString().split('T')[0]}
        />
        <Input
          type="time"
          value={startTime}
          onChange={(e) => setStartTime(e.target.value)}
        />
        <Input
          type="time"
          value={endTime}
          onChange={(e) => setEndTime(e.target.value)}
        />
        <Input
          type="number"
          placeholder="Available slots"
          value={slots}
          onChange={(e) => setSlots(e.target.value)}
          min="1"
        />
      </div>

      <Button 
        type="button"
        onClick={handleAdd}
        disabled={!date || !startTime || !endTime || !slots}
      >
        Add Time Slot
      </Button>

      <div className="space-y-2">
        {value.map((slot, index) => (
          <div 
            key={index}
            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
          >
            <div>
              <p className="font-medium">{new Date(slot.date).toLocaleDateString()}</p>
              <p className="text-sm text-gray-600">
                {slot.start_time} - {slot.end_time} ({slot.available_slots} slots)
              </p>
            </div>
            <button
              onClick={() => onRemove(index)}
              className="p-1 hover:bg-gray-200 rounded-full"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DateTimePicker; 