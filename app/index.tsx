// app/index.tsx
import React from "react";
import { Text, View } from "react-native";
import SessionChecker from "../components/SessionChecker";

export default function Index() {
  return (
    <SessionChecker>
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text>Welcome to iRide</Text>
      </View>
    </SessionChecker>
  );
}
