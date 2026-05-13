import React, { useEffect, useState } from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { api } from "../api/client";
import { styles } from "../styles";

export function HomeScreen({ token, onStart }) {
  const [templates, setTemplates] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([api("/checklists", token), api("/vehicles", token), api("/submissions", token)])
      .then(([c, v, s]) => { setTemplates(c.filter((item) => item.active)); setVehicles(v); setSubmissions(s); })
      .catch((err) => setError(err.message));
  }, [token]);

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Inicio</Text>
      {!!error && <Text style={styles.error}>{error}</Text>}
      <Text style={styles.label}>Checklists disponiveis</Text>
      {templates.map((template) => (
        <View key={template.id} style={styles.card}>
          <Text style={{ fontWeight: "800", fontSize: 16 }}>{template.name}</Text>
          <Text>{template.description}</Text>
          <Text style={[styles.label, { marginTop: 12 }]}>Selecionar veiculo</Text>
          {vehicles.slice(0, 5).map((vehicle) => (
            <TouchableOpacity key={vehicle.id} style={styles.option} onPress={() => onStart({ templateId: template.id, vehicleId: vehicle.id, vehicle })}>
              <Text>{vehicle.plate} - {vehicle.brand} {vehicle.model}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={styles.darkButton} onPress={() => onStart({ templateId: template.id })}>
            <Text style={styles.darkButtonText}>Preencher sem veiculo</Text>
          </TouchableOpacity>
        </View>
      ))}
      <Text style={styles.label}>Meus rascunhos, pendentes e finalizados</Text>
      {submissions.map((item) => (
        <View key={item.id} style={styles.card}>
          <Text style={{ fontWeight: "800" }}>{item.checklist_name}</Text>
          <Text>{item.plate || "Sem veiculo"} - {item.status}</Text>
        </View>
      ))}
    </ScrollView>
  );
}
