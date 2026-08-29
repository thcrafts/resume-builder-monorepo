import * as React from "react";
import { Outlet, useOutletContext } from "react-router";

const LayoutWithoutHeader: React.FC = () => {
  const context = useOutletContext();

  return (
    <div className="min-h-screen w-full bg-background p-4 text-foreground">
      <Outlet context={context} />
    </div>
  );
};

export default LayoutWithoutHeader;
