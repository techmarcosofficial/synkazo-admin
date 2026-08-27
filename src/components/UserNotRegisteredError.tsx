import { AlertTriangle } from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';

const UserNotRegisteredError = () => {
  return (
    <div className="bg-background flex min-h-screen flex-col items-center justify-center">
      <Card className="w-full max-w-md">
        <CardContent className="text-center">
          <div className="bg-warning/10 mx-auto mb-6 inline-flex h-16 w-16 items-center justify-center rounded-full">
            <AlertTriangle className="text-warning h-8 w-8" />
          </div>
          <h1 className="text-foreground mb-4 text-2xl font-bold tracking-tight">
            Access Restricted
          </h1>
          <p className="text-muted-foreground mb-8">
            You are not registered to use this application. Please contact the
            app administrator to request access.
          </p>
          <div className="bg-muted text-muted-foreground rounded-md p-4 text-left text-sm">
            <p>If you believe this is an error, you can:</p>
            <ul className="mt-2 list-inside list-disc space-y-1">
              <li>Verify you are logged in with the correct account</li>
              <li>Contact the app administrator for access</li>
              <li>Try logging out and back in again</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default UserNotRegisteredError;
