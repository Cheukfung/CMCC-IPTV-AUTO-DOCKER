import React from "react";
import { Switch, Label } from "@heroui/react";

export function AppSwitch({ children, ...props }) {
  return (
    <Switch className="app-switch" {...props}>
      <Switch.Control>
        <Switch.Thumb />
      </Switch.Control>
      {children ? (
        <Switch.Content>
          <Label>{children}</Label>
        </Switch.Content>
      ) : null}
    </Switch>
  );
}