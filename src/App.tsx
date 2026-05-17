/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { TooltipProvider } from "@/components/ui/tooltip";
import Home from "./pages/Home";

export default function App() {
  return (
    <TooltipProvider>
      <Home />
    </TooltipProvider>
  );
}
