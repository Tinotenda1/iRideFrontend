// app/index.tsx
import React from "react";
import { View } from "react-native";
import SessionChecker from "../components/SessionChecker";

export default function Index() {
  return (
    <SessionChecker>
      <View></View>
    </SessionChecker>
  );
}
