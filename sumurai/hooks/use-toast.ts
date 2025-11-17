// Simple toast implementation
// This is a placeholder - you can replace with a proper toast library later

type ToastProps = {
  title: string;
  description?: string;
  variant?: "default" | "destructive";
};

export function useToast() {
  const toast = ({ title, description, variant }: ToastProps) => {
    // For now, we'll use console and alert
    // You can replace this with a proper toast library like react-hot-toast or sonner
    const message = description ? `${title}\n${description}` : title;

    if (variant === "destructive") {
      console.error(message);
      alert(message);
    } else {
      console.log(message);
      alert(message);
    }
  };

  return { toast };
}
