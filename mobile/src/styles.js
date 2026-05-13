import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f5f5f2" },
  header: { backgroundColor: "#111", padding: 18, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  brand: { color: "#f6c600", fontSize: 24, fontWeight: "900" },
  headerTitle: { color: "#fff", fontSize: 13 },
  link: { color: "#f6c600", fontWeight: "700" },
  container: { padding: 16 },
  card: { backgroundColor: "#fff", borderRadius: 8, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: "#e4e4e7" },
  title: { fontSize: 22, fontWeight: "800", marginBottom: 8, color: "#111" },
  label: { fontSize: 12, fontWeight: "800", color: "#52525b", marginBottom: 4, textTransform: "uppercase" },
  input: { borderWidth: 1, borderColor: "#d4d4d8", borderRadius: 6, padding: 10, marginBottom: 12, backgroundColor: "#fff" },
  button: { backgroundColor: "#f6c600", borderRadius: 6, padding: 12, alignItems: "center", marginTop: 8 },
  darkButton: { backgroundColor: "#111", borderRadius: 6, padding: 12, alignItems: "center", marginTop: 8 },
  buttonText: { color: "#111", fontWeight: "800" },
  darkButtonText: { color: "#fff", fontWeight: "800" },
  error: { backgroundColor: "#fee2e2", color: "#991b1b", padding: 10, borderRadius: 6, marginBottom: 10 },
  success: { backgroundColor: "#dcfce7", color: "#166534", padding: 10, borderRadius: 6, marginBottom: 10 },
  apiBar: { backgroundColor: "#fff", borderRadius: 6, borderWidth: 1, borderColor: "#e4e4e7", padding: 10, marginBottom: 12 },
  apiUrl: { color: "#52525b", fontSize: 12, marginBottom: 6 },
  apiAction: { color: "#111", fontWeight: "800" },
  option: { borderWidth: 1, borderColor: "#d4d4d8", borderRadius: 6, padding: 10, marginTop: 8 },
  optionActive: { borderColor: "#111", backgroundColor: "#fef3c7" }
});
