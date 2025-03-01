import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { X, Upload, Loader2, GripVertical } from "lucide-react";
import { useDropzone } from "react-dropzone";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import imageCompression from "browser-image-compression";
import { toast } from "@/components/ui/use-toast";
import { useAuth } from "@/contexts/AuthContext";

interface ImageUploadProps {
  value: string[];
  onChange: (urls: string[]) => void;
  onRemove: (url: string) => void;
  maxFiles?: number;
  title: string;
}

const ImageUpload = ({ 
  value = [],
  onChange, 
  onRemove, 
  maxFiles = 5,
  title
}: ImageUploadProps) => {
  const [loading, setLoading] = useState(false);
  const { getAuthHeader } = useAuth();

  const compressImage = async (file: File) => {
    const options = {
      maxSizeMB: 1,
      maxWidthOrHeight: 1920,
      useWebWorker: true
    };
    
    try {
      return await imageCompression(file, options);
    } catch (error) {
      console.error("Error compressing image:", error);
      return file;
    }
  };

  const onUpload = async (file: File) => {
    try {
      // Create a new filename with extension
      const extension = file.name.split('.').pop() || 'jpg';
      const newFile = new File([file], `${title || 'upload'}-${Date.now()}.${extension}`, {
        type: file.type
      });

      const formData = new FormData();
      formData.append('image', newFile);
      formData.append('title', title || 'upload');

      const headers = getAuthHeader();
      if (!headers) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(`${import.meta.env.VITE_API_URL}/upload`, {
        method: 'POST',
        headers: {
          ...headers
        },
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Upload failed');
      }

      const data = await response.json();
      return data.url;
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to upload image",
        variant: "destructive",
      });
      return null;
    }
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (value.length + acceptedFiles.length > maxFiles) {
      toast({
        title: "Error",
        description: `You can only upload up to ${maxFiles} images`,
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const uploadPromises = [];
      
      // Compress and prepare uploads
      for (const file of acceptedFiles) {
        const compressedFile = await compressImage(file);
        uploadPromises.push(onUpload(compressedFile));
      }
      
      // Wait for all uploads to complete
      const results = await Promise.all(uploadPromises);
      
      // Filter out any failed uploads
      const successfulUploads = results.filter(Boolean);
      
      // Update state with new URLs
      if (successfulUploads.length > 0) {
        const newUrls = [...value, ...successfulUploads];
        onChange(newUrls);
        
        console.log('New images array:', newUrls);
        toast({
          title: "Success",
          description: `${successfulUploads.length} image(s) uploaded successfully`,
        });
      }
    } catch (error) {
      console.error('Error uploading images:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to upload images',
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [value, onChange, maxFiles]);

  const onDragEnd = (result: any) => {
    if (!result.destination) return;

    const items = Array.from(value);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    onChange(items);
  };

  const getDisplayUrl = (url: string) => {
    if (!url) return '/default-image.jpg';
    if (url.startsWith('http')) return url;
    return `${import.meta.env.VITE_API_URL}/${url}`;
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif']
    },
    maxFiles: maxFiles - value.length,
    disabled: loading
  });

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-lg p-6 cursor-pointer
          transition-colors duration-200 ease-in-out
          ${isDragActive ? 'border-primary bg-primary/5' : 'border-gray-300'}
          ${loading ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center justify-center text-sm text-gray-600">
          {loading ? (
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
          ) : (
            <>
              <Upload className="h-10 w-10 mb-2 text-gray-400" />
              <p className="text-center">
                Drag & drop images here, or click to select
                <br />
                <span className="text-xs text-gray-400">
                  {maxFiles - value.length} images remaining
                </span>
              </p>
            </>
          )}
        </div>
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="images">
          {(provided) => (
            <div
              {...provided.droppableProps}
              ref={provided.innerRef}
              className="space-y-2"
            >
              {value.map((url, index) => (
                <Draggable key={url} draggableId={url} index={index}>
                  {(provided) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      className="relative flex items-center bg-gray-50 rounded-lg overflow-hidden"
                    >
                      <div {...provided.dragHandleProps} className="px-2">
                        <GripVertical className="h-5 w-5 text-gray-400" />
                      </div>
                      <img
                        src={getDisplayUrl(url)}
                        alt={`Upload ${index + 1}`}
                        className="h-20 w-20 object-cover"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        className="absolute top-1 right-1 h-6 w-6 p-0"
                        onClick={() => onRemove(url)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
    </div>
  );
};

export default ImageUpload; 