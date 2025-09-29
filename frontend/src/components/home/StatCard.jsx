import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";

const StatCard = ({ name, icon: Icon, value, color, loading, statuses=[] }) => {
  return (
    <motion.div
      className="bg-card shadow-sm border border-border overflow-hidden rounded-xl"
      //   whileHover={{ y: -5, boxShadow: "0 15px 20px -12px rgba(0, 0, 0, 0.5)" }}
    >
      {loading ? (
        <Skeleton className={"h-[100px]"} />
      ) : (
        <div className="md:px-4 md:py-5 p-6">
          <span className="flex items-center justify-between text-xs text-muted-foreground ">
            
            {name}
            <Icon size={20} className={`mr-3 text-accent-foreground`}  />
          </span>
          <p className="mt-1 text-3xl md:text-4xl tracking-tight font-bold ">{value}</p>
         {/* Render statuses if available */}
         {statuses.length > 0 && (
            <div className="space-x-2 mt-2">
              {statuses.map((status, index) => (
                <span
                  key={index}
                  className=" text-xs py-1 px-2 rounded-md"
                  style={{
                    color: status.color,
                    backgroundColor: status.bgColor,
                  }}
                >
                  {status.label}
                </span>
              ))}
            </div>
          )}

        </div>
      )}
    </motion.div>
  );
};
export default StatCard;
