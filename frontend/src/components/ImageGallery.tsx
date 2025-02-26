import { useState } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';

interface ImageGalleryProps {
  images: { url: string; order: number }[];
  onDelete?: (url: string) => void;
  onReorder?: (newOrder: string[]) => void;
  editable?: boolean;
}

export const ImageGallery = ({ 
  images, 
  onDelete, 
  onReorder,
  editable = false 
}: ImageGalleryProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (!images.length) return null;

  const handleDragEnd = (result: any) => {
    if (!result.destination || !onReorder) return;

    const items = Array.from(images);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    onReorder(items.map(item => item.url));
  };

  const nextImage = () => {
    setCurrentIndex((prev) => (prev + 1) % images.length);
  };

  const previousImage = () => {
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="relative group">
        <div className="aspect-video relative overflow-hidden rounded-lg">
          <img
            src={images[currentIndex].url}
            alt={`Image ${currentIndex + 1}`}
            className="w-full h-full object-cover"
          />
          
          {images.length > 1 && (
            <>
              <button
                onClick={previousImage}
                className="absolute left-2 top-1/2 -translate-y-1/2 p-1 rounded-full 
                         bg-black/50 text-white opacity-0 group-hover:opacity-100 
                         transition-opacity duration-200"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button
                onClick={nextImage}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full 
                         bg-black/50 text-white opacity-0 group-hover:opacity-100 
                         transition-opacity duration-200"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </>
          )}
          
          {editable && onDelete && (
            <button
              onClick={() => onDelete(images[currentIndex].url)}
              className="absolute top-2 right-2 p-1 rounded-full bg-red-500/80 
                       text-white opacity-0 group-hover:opacity-100 
                       transition-opacity duration-200"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        
        {images.length > 1 && (
          <div className="flex justify-center mt-2 gap-2">
            {images.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={`w-2 h-2 rounded-full transition-colors duration-200 
                         ${index === currentIndex ? 'bg-primary' : 'bg-gray-300'}`}
              />
            ))}
          </div>
        )}
      </div>
    </DragDropContext>
  );
}; 