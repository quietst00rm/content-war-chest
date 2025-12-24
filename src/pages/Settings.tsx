import { Navigation } from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users } from "lucide-react";
import { Link } from "react-router-dom";

const Settings = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navigation />

      <main className="flex-1 p-4 sm:p-6 max-w-4xl mx-auto w-full">
        <h1 className="text-2xl font-bold mb-6">Settings</h1>

        <div className="space-y-6">
          {/* Profile Management */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Profile Management
              </CardTitle>
              <CardDescription>
                Manage your target LinkedIn profiles
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link to="/engagement">
                <Button variant="outline">
                  Manage Target Profiles
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Settings;
