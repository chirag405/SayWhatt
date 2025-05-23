"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CardContainer, CardBody, CardItem } from "@/components/ui/3d-card";
import { HoverBorderGradient } from "@/components/ui/hover-border-gradient";
import {
  Heart,
  MessageSquare,
  Share2,
  Bookmark,
  Coffee,
  Mail,
  Twitter,
  Linkedin,
  MessageCircle,
  Sparkles,
  Zap,
  Star,
  Gift,
} from "lucide-react";

// Discord icon component since it's not in lucide-react
const DiscordIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z" />
  </svg>
);

interface GameFooterProps {
  className?: string;
}

export default function GameFooter({ className = "" }: GameFooterProps) {
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [bookmarkClicked, setBookmarkClicked] = useState(false);
  const [shareClicked, setShareClicked] = useState(false);

  const handleBookmark = () => {
    setBookmarkClicked(true);
    setTimeout(() => setBookmarkClicked(false), 2000);
    // You can add actual bookmark functionality here
  };

  const handleShare = async () => {
    setShareClicked(true);
    setTimeout(() => setShareClicked(false), 2000);

    if (navigator.share) {
      try {
        await navigator.share({
          title: "SayWhat - The Ultimate Word Association Game",
          text: "Check out this awesome word guessing game where you test your vocabulary and quick thinking!",
          url: window.location.href,
        });
      } catch (err) {
        console.log("Error sharing:", err);
      }
    } else {
      // Fallback - copy to clipboard
      navigator.clipboard.writeText(window.location.href);
    }
  };
  const socialLinks = [
    {
      id: "discord",
      icon: <DiscordIcon />,
      label: "Discord",
      href: "https://discord.com/users/525254633766256651", // Replace with your Discord profile/server
      color: "from-indigo-500 to-purple-600",
      hoverColor: "hover:text-indigo-400",
      description: "Join the community",
    },
    {
      id: "twitter",
      icon: <Twitter className="w-5 h-5" />,
      label: "Twitter/X",
      href: "https://x.com/Bng89289502", // Replace with your Twitter/X profile
      color: "from-blue-400 to-blue-600",
      hoverColor: "hover:text-blue-400",
      description: "Follow for updates",
    },
    {
      id: "linkedin",
      icon: <Linkedin className="w-5 h-5" />,
      label: "LinkedIn",
      href: "https://linkedin.com/in/chirag404", // Replace with your LinkedIn profile
      color: "from-blue-600 to-blue-800",
      hoverColor: "hover:text-blue-500",
      description: "Professional network",
    },
  ];

  const actionItems = [
    {
      id: "coffee",
      icon: <Coffee className="w-5 h-5" />,
      label: "Buy Me Coffee",
      action: () => window.open("#", "_blank"), // Replace with your coffee link
      color: "from-yellow-500 to-orange-600",
      hoverColor: "hover:text-yellow-400",
      description: "Fuel development ☕",
    },
    {
      id: "feedback",
      icon: <Mail className="w-5 h-5" />,
      label: "Send Feedback",
      action: () =>
        window.open(
          "mailto:your-email@example.com?subject=SayWhat Game Feedback",
          "_blank"
        ), // Replace with your email
      color: "from-green-500 to-emerald-600",
      hoverColor: "hover:text-green-400",
      description: "Share your thoughts",
    },
    {
      id: "share",
      icon: <Share2 className="w-5 h-5" />,
      label: "Share Game",
      action: handleShare,
      color: "from-pink-500 to-rose-600",
      hoverColor: "hover:text-pink-400",
      description: "Sharing is caring! 💝",
    },
    {
      id: "bookmark",
      icon: <Bookmark className="w-5 h-5" />,
      label: "Bookmark",
      action: handleBookmark,
      color: "from-purple-500 to-violet-600",
      hoverColor: "hover:text-purple-400",
      description: "Come back anytime",
    },
  ];

  return (
    <div className={`w-full relative mt-6 md:mt-8 ${className}`}>
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.2 }}
        className="relative"
      >
        <CardContainer className="w-full">
          <CardBody className="bg-slate-900/60 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
            {/* Animated background elements */}
            <div className="absolute inset-0 overflow-hidden">
              <motion.div
                animate={{
                  rotate: [0, 360],
                  scale: [1, 1.1, 1],
                }}
                transition={{
                  duration: 20,
                  repeat: Infinity,
                  ease: "linear",
                }}
                className="absolute -top-4 -right-4 w-16 h-16 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-full blur-xl"
              />
              <motion.div
                animate={{
                  rotate: [360, 0],
                  scale: [1, 1.2, 1],
                }}
                transition={{
                  duration: 15,
                  repeat: Infinity,
                  ease: "linear",
                }}
                className="absolute -bottom-4 -left-4 w-12 h-12 bg-gradient-to-r from-pink-500/20 to-yellow-500/20 rounded-full blur-xl"
              />
            </div>

            {/* Header */}
            <CardItem translateZ={20} className="text-center mb-6 relative">
              <motion.div
                whileHover={{ scale: 1.05 }}
                className="inline-flex items-center gap-2 text-2xl font-bold bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500 bg-clip-text text-transparent"
              >
                <Sparkles className="w-6 h-6 text-cyan-400" />
                <span>Level Up Together</span>
                <Zap className="w-6 h-6 text-purple-500" />
              </motion.div>
              <p className="text-slate-400 mt-2 font-medium">
                Connect • Support • Share • Return
              </p>
            </CardItem>

            {/* Social Links Section */}
            <CardItem translateZ={30} className="mb-8">
              <div className="text-center mb-4">
                <h3 className="text-lg font-semibold text-white flex items-center justify-center gap-2">
                  <MessageCircle className="w-5 h-5 text-blue-400" />
                  Connect with Me
                </h3>
              </div>
              <div className="flex justify-center gap-4">
                {socialLinks.map((social) => (
                  <motion.div
                    key={social.id}
                    whileHover={{ scale: 1.1, y: -5 }}
                    whileTap={{ scale: 0.95 }}
                    onHoverStart={() => setHoveredItem(social.id)}
                    onHoverEnd={() => setHoveredItem(null)}
                    className="relative"
                  >
                    {" "}
                    <HoverBorderGradient
                      containerClassName="rounded-xl"
                      className="p-3 bg-slate-800/70 hover:bg-slate-700/70 transition-all duration-300"
                    >
                      <a
                        href={
                          social.href.startsWith("http")
                            ? social.href
                            : `https://${social.href}`
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`block text-slate-300 ${social.hoverColor} transition-colors duration-300`}
                      >
                        {social.icon}
                      </a>
                    </HoverBorderGradient>
                    <AnimatePresence>
                      {hoveredItem === social.id && (
                        <motion.div
                          initial={{ opacity: 0, y: 10, scale: 0.8 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 10, scale: 0.8 }}
                          className="absolute -top-16 left-1/2 transform -translate-x-1/2 z-50"
                        >
                          <div className="bg-slate-800 text-white px-3 py-2 rounded-lg text-sm whitespace-nowrap border border-slate-600 shadow-xl">
                            <div className="font-medium">{social.label}</div>
                            <div className="text-xs text-slate-400">
                              {social.description}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                ))}
              </div>
            </CardItem>

            {/* Action Items Section */}
            <CardItem translateZ={40} className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-5">
                {actionItems.map((item) => (
                  <motion.div
                    key={item.id}
                    whileHover={{ scale: 1.05, y: -3 }}
                    whileTap={{ scale: 0.95 }}
                    onHoverStart={() => setHoveredItem(item.id)}
                    onHoverEnd={() => setHoveredItem(null)}
                    className="relative"
                  >
                    <button
                      onClick={item.action}
                      className={`w-full p-4 rounded-xl bg-gradient-to-br ${item.color} bg-opacity-20 border border-slate-600/50 hover:border-slate-500 transition-all duration-300 group relative overflow-hidden`}
                    >
                      {/* Success animations */}
                      <AnimatePresence>
                        {item.id === "bookmark" && bookmarkClicked && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: [0, 1.5, 1] }}
                            exit={{ scale: 0 }}
                            className="absolute inset-0 flex items-center justify-center"
                          >
                            <Star className="w-8 h-8 text-yellow-400 fill-yellow-400" />
                          </motion.div>
                        )}
                        {item.id === "share" && shareClicked && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: [0, 1.5, 1] }}
                            exit={{ scale: 0 }}
                            className="absolute inset-0 flex items-center justify-center"
                          >
                            <Heart className="w-8 h-8 text-pink-400 fill-pink-400" />
                          </motion.div>
                        )}
                      </AnimatePresence>

                      <div className="flex flex-col items-center gap-2 relative z-10">
                        <motion.div
                          whileHover={{ rotate: [0, -10, 10, 0] }}
                          transition={{ duration: 0.5 }}
                          className={`text-slate-300 ${item.hoverColor} transition-colors duration-300`}
                        >
                          {item.icon}
                        </motion.div>
                        <span className="text-sm font-medium text-white group-hover:text-slate-100 transition-colors duration-300">
                          {item.label}
                        </span>
                      </div>

                      {/* Hover effect */}
                      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    </button>

                    <AnimatePresence>
                      {hoveredItem === item.id && (
                        <motion.div
                          initial={{ opacity: 0, y: 10, scale: 0.8 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 10, scale: 0.8 }}
                          className="absolute -top-16 left-1/2 transform -translate-x-1/2 z-50"
                        >
                          <div className="bg-slate-800 text-white px-3 py-2 rounded-lg text-sm whitespace-nowrap border border-slate-600 shadow-xl">
                            <div className="text-xs text-slate-400">
                              {item.description}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                ))}
              </div>
            </CardItem>

            {/* Achievement Badge */}
            <CardItem translateZ={50} className="mt-6 text-center">
              <motion.div
                whileHover={{ scale: 1.05 }}
                className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 rounded-full"
              >
                <Gift className="w-4 h-4 text-yellow-400" />
                <span className="text-sm font-medium text-yellow-200">
                  Thanks for playing SayWhat! 🎮
                </span>
                <motion.div
                  animate={{ rotate: [0, 10, 0, -10, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  ⭐
                </motion.div>
              </motion.div>
            </CardItem>
          </CardBody>
        </CardContainer>
      </motion.div>
    </div>
  );
}
