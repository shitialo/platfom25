import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Camera } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { uploadProfileImage } from "@/api/userProfile";
import { useAuth } from "@/contexts/AuthContext";

interface ProfileImageUploadProps {
  imageUrl?: string;
  name: string;
  onImageUploaded: (imageUrl: string) => void;
}

const ProfileImageUpload = ({ imageUrl, name, onImageUploaded }: ProfileImageUploadProps) => {
  const { getAuthHeader } = useAuth();
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid file type",
        description: "Please select an image file",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Image must be less than 5MB",
        variant: "destructive",
      });
      return;
    }

    const authHeader = getAuthHeader();
    if (!authHeader) {
      toast({
        title: "Authentication Error",
        description: "You must be logged in to upload an image",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);

    try {
      // Create a local URL for the image to show immediately
      const localImageUrl = URL.createObjectURL(file);
      
      // Call the API but handle errors gracefully
      try {
        const result = await uploadProfileImage(file, authHeader);
        onImageUploaded(result.imageUrl);
      } catch (error) {
        console.error("Error uploading image:", error);
        // Use the local URL as a fallback
        onImageUploaded(localImageUrl);
        
        toast({
          title: "API Error",
          description: "Image uploaded locally only. Server storage unavailable.",
          variant: "destructive",
        });
        return;
      }
      
      toast({
        title: "Success",
        description: "Profile image updated successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to upload image",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      // Clear the input value to allow uploading the same file again
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  return (
    <div className="relative">
      <Avatar className="w-24 h-24">
        <AvatarImage src={imageUrl || "/images/placeholder-avatar.png"} alt={name} />
        <AvatarFallback>{name.charAt(0)}</AvatarFallback>
      </Avatar>
      
      <Button
        size="icon"
        variant="secondary"
        className="absolute bottom-0 right-0 rounded-full"
        onClick={handleButtonClick}
        disabled={isUploading}
      >
        <Camera className="w-4 h-4" />
      </Button>
      
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="image/*"
        onChange={handleFileChange}
        disabled={isUploading}
      />
      
      {isUploading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 rounded-full">
          <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
        </div>
      )}
    </div>
  );
};

export default ProfileImageUpload; 