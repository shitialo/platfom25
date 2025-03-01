import { useState, useEffect } from 'react';
import MainLayout from "@/components/layout/MainLayout";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { HostChatList } from "@/components/chat/HostChatList";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";

const HostMessages = () => {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState("messages");

  // Redirect if not a host
  if (!loading && (!user || !user.is_host)) {
    return <Navigate to="/" />;
  }

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">Messages</h1>
        
        <Tabs defaultValue="messages" onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="messages">Messages</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
          </TabsList>
          
          <TabsContent value="messages">
            <Card className="p-6">
              <HostChatList />
            </Card>
          </TabsContent>
          
          <TabsContent value="notifications">
            <Card className="p-6">
              <h2 className="text-2xl font-semibold mb-4">Notifications</h2>
              <p className="text-muted-foreground">
                You don't have any notifications at the moment.
              </p>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
};

export default HostMessages;
