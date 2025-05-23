import { useEffect, useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Plus,
  Settings,
  History,
  HelpCircle,
  Sun,
  Moon,
  ChevronLeft,
  ChevronRight,
  Loader2,
  PanelRight,
  PanelLeft,
  RadioReceiver,
  Bot,
  Workflow,
} from "lucide-react";
import { useTheme } from "@/components/ui/theme-provider";
import { useFetchChatHistory } from "@/hooks/fetchChatHistory";
import { createConversation } from "@/lib/services/conversation";

export interface ChatHistoryItem {
  id: string;
  title: string;
  preview_text?: string;
  updated_at?: string;
}

function Sidebar() {
  const { theme, setTheme } = useTheme();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const {
    chatHistory,
    fetchChatHistory,
    isLoading: isHistoryLoading,
  } = useFetchChatHistory();
  const [isCreatingChat, setIsCreatingChat] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchChatHistory();
  }, []);

  const handleNewChatClick = async () => {
    setIsCreatingChat(true);
    try {
      const newConvo = await createConversation();
      await fetchChatHistory();
      navigate(`/${newConvo.id}`);
    } finally {
      setIsCreatingChat(false);
    }
  };

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  const sidebarWidth = isCollapsed ? "w-16" : "w-64";
  const shouldShowContent = !isCollapsed;

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <div
        className={`${sidebarWidth} flex flex-col  h-full bg-grey-800 dark:bg-background transition-all duration-300 ease-in-out relative`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Collapse/Expand Button */}
        <button
          onClick={toggleSidebar}
          className=" mt-4 ml-5 w-fit p-0 bg-background  shadow-sm rounded-sm  cursor-pointer "
        >
          {isCollapsed ? (
            <PanelLeft className="w-6 h-6" />
          ) : (
            <PanelRight className="w-6 h-6" />
          )}
        </button>

        <div className="flex-1 overflow-hidden">
          {/* New Chat Button */}
          <div className="p-4">
            <Button
              onClick={handleNewChatClick}
              className={`w-full cursor-pointer ${isCollapsed ? "px-0" : ""}`}
              variant="outline"
              disabled={isCreatingChat}
            >
              {isCreatingChat ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Plus className={`h-4 w-4 ${isCollapsed ? "" : "mr-2"}`} />
                  {shouldShowContent && !isCollapsed && "New Chat"}
                </>
              )}
            </Button>
          </div>
          <div className="px-3 space-y-2">
            <Button
              variant="ghost"
              className={`w-full justify-start ${isCollapsed ? "px-2" : ""}`}
            >
              <Bot  className="h-4 w-4" />
              {shouldShowContent && !isCollapsed && (
                <span className="ml-2">Agents</span>
              )}
            </Button>
            <Button
              variant="ghost"
              className={`w-full justify-start ${isCollapsed ? "px-2" : ""}`}
            >
              <Settings className="h-4 w-4" />
              {shouldShowContent && !isCollapsed && (
                <span className="ml-2">Tools</span>
              )}
            </Button>
            <Button
              variant="ghost"
              className={`w-full justify-start ${isCollapsed ? "px-2" : ""}`}
            >
              <RadioReceiver className="w-4 h-4" />
              {shouldShowContent && !isCollapsed && (
                <span className="ml-2">Add Device</span>
              )}
            </Button>
            <Button
              variant="ghost"
              className={`w-full justify-start ${isCollapsed ? "px-2" : ""}`}
            >
              <Workflow className="h-4 w-4" />
              {shouldShowContent && !isCollapsed && (
                <span className="ml-2">Workflows</span>
              )}
            </Button>
 
          </div>

          <div className="px-4">
            <Separator className="my-2" />
          </div>

          {/* Chat History */}
          <ScrollArea className="h-[calc(100%-180px)]">
            <div className="p-4">
              {shouldShowContent && !isCollapsed && (
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                  Recent Chats
                </h3>
              )}
              {isHistoryLoading ? (
                <div className="flex justify-center items-center h-20">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : (
                <div className="space-y-2">
                  {chatHistory?.map((chat: ChatHistoryItem) => (
                    <Button
                      onClick={() => navigate(`/${chat.id}`)}
                      key={chat.id}
                      variant="ghost"
                      className={`w-full justify-start cursor-pointer ${isCollapsed ? "px-2" : ""}`}
                    >
                      {shouldShowContent ? (
                        <div className="truncate">
                          <div className="font-medium">
                            {isCollapsed
                              ? chat.title.charAt(0)
                              : chat.title.length > 30
                                ? chat.title.slice(0, 30) + "..."
                                : chat.title}
                          </div>
                        </div>
                      ) : (
                        <div className="flex p-1 items-center justify-center">
                          {chat.title.charAt(0)}
                        </div>
                      )}
                    </Button>
                  ))}
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Bottom Navigation */}
        <div className="p-3 space-y-2">
          {/* Theme Toggle */}
          <Button
            onClick={toggleTheme}
            variant="ghost"
            className={`w-full justify-start ${isCollapsed ? "px-2" : ""}`}
          >
            {theme === "dark" ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
            {shouldShowContent && !isCollapsed && (
              <span className="ml-2">
                {theme === "dark" ? "Light Mode" : "Dark Mode"}
              </span>
            )}
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <Outlet context={{ fetchChatHistory, isHistoryLoading }} />
      </div>
    </div>
  );
}

export default Sidebar;
