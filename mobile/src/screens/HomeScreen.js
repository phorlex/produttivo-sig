import React, { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import { api } from "../api/client";
import { styles } from "../styles";

const emptyVehicle = { plate: "", brand: "", model: "", year: "" };
const statusLabels = {
  draft: "Rascunho",
  pending: "Pendente",
  finished: "Finalizado"
};

export function HomeScreen({ token, onStart }) {
  const [templates, setTemplates] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [showTemplates, setShowTemplates] = useState(false);
  const [submissionFilter, setSubmissionFilter] = useState("all");
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [vehicleForm, setVehicleForm] = useState(emptyVehicle);
  const [savingVehicle, setSavingVehicle] = useState(false);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const [checklists, loadedVehicles, loadedSubmissions] = await Promise.all([
        api("/checklists", token),
        api("/vehicles", token),
        api("/submissions", token)
      ]);
      setTemplates(checklists.filter((item) => item.active));
      setVehicles(loadedVehicles);
      setSubmissions(loadedSubmissions);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [token]);

  function selectTemplate(template, vehicle = null) {
    setSelectedTemplate(template);
    setSelectedVehicle(vehicle);
    setVehicleForm(vehicle ? {
      plate: vehicle.plate || "",
      brand: vehicle.brand || "",
      model: vehicle.model || "",
      year: vehicle.year ? String(vehicle.year) : ""
    } : emptyVehicle);
    setError("");
  }

  function startWithExistingVehicle(template, vehicle) {
    if (!vehicle.plate || !vehicle.brand || !vehicle.model || !vehicle.year) {
      setError("Este veiculo esta incompleto. Informe placa, marca, modelo e ano antes de iniciar o checklist.");
      selectTemplate(template, vehicle);
      return;
    }
    onStart({ templateId: template.id, vehicleId: vehicle.id, vehicle });
  }

  function openSubmission(item, mode) {
    onStart({
      submissionId: item.id,
      templateId: item.template_id,
      vehicleId: item.vehicle_id,
      mode,
      vehicle: {
        plate: item.plate || "",
        brand: item.brand || "",
        model: item.model || ""
      }
    });
  }

  async function startWithNewVehicle() {
    if (!selectedTemplate) return;
    const plate = vehicleForm.plate.trim().toUpperCase();
    const brand = vehicleForm.brand.trim();
    const model = vehicleForm.model.trim();
    const year = Number(vehicleForm.year);

    if (!plate || !brand || !model || !vehicleForm.year.trim()) {
      setError("Preencha placa, marca, modelo e ano do veiculo para iniciar o checklist.");
      return;
    }
    if (!Number.isInteger(year) || year < 1900 || year > 2100) {
      setError("Informe um ano de veiculo valido.");
      return;
    }

    setSavingVehicle(true);
    setError("");
    try {
      const vehiclePayload = {
        plate,
        brand,
        model,
        year,
        version: selectedVehicle?.version || "",
        color: selectedVehicle?.color || "",
        mileage: selectedVehicle?.mileage || null,
        store: selectedVehicle?.store || "",
        status: selectedVehicle?.status || "ativo",
        notes: selectedVehicle?.notes || ""
      };
      const vehicle = await api(selectedVehicle ? `/vehicles/${selectedVehicle.id}` : "/vehicles", token, {
        method: selectedVehicle ? "PUT" : "POST",
        body: JSON.stringify(vehiclePayload)
      });
      setVehicles(selectedVehicle
        ? vehicles.map((item) => item.id === vehicle.id ? vehicle : item)
        : [vehicle, ...vehicles]);
      onStart({ templateId: selectedTemplate.id, vehicleId: vehicle.id, vehicle });
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingVehicle(false);
    }
  }

  const visibleSubmissions = submissionFilter === "finished"
    ? submissions.filter((item) => item.status === "finished")
    : submissions;

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Inicio</Text>
      {!!error && <Text style={styles.error}>{error}</Text>}
      <View style={styles.card}>
        <Text style={styles.label}>Novo checklist</Text>
        <Text style={{ fontSize: 16, fontWeight: "800", marginBottom: 6 }}>Puxar modelo salvo</Text>
        <Text>Escolha um modelo cadastrado no painel e comece um novo preenchimento no telefone.</Text>
        <TouchableOpacity style={styles.button} onPress={() => setShowTemplates(!showTemplates)}>
          <Text style={styles.buttonText}>{showTemplates ? "Ocultar modelos" : "Novo checklist"}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.darkButton} onPress={load}>
          <Text style={styles.darkButtonText}>Atualizar modelos salvos</Text>
        </TouchableOpacity>
      </View>

      {loading && <ActivityIndicator color="#111" style={{ marginVertical: 16 }} />}

      {showTemplates && (
        <>
          <Text style={styles.label}>Modelos salvos</Text>
          {!loading && !templates.length && (
            <View style={styles.card}>
              <Text>Nenhum modelo ativo encontrado. Crie ou ative um modelo no painel web para ele aparecer aqui.</Text>
            </View>
          )}
          {templates.map((template) => (
            <View key={template.id} style={styles.card}>
              <Text style={{ fontWeight: "800", fontSize: 16 }}>{template.name}</Text>
              {!!template.description && <Text>{template.description}</Text>}
              <Text style={[styles.label, { marginTop: 12 }]}>Selecionar veiculo cadastrado</Text>
              {vehicles.slice(0, 5).map((vehicle) => (
                <TouchableOpacity key={vehicle.id} style={styles.option} onPress={() => startWithExistingVehicle(template, vehicle)}>
                  <Text>{vehicle.plate} - {vehicle.brand} {vehicle.model} {vehicle.year || ""}</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity style={styles.darkButton} onPress={() => selectTemplate(template)}>
                <Text style={styles.darkButtonText}>Cadastrar veiculo para este modelo</Text>
              </TouchableOpacity>
            </View>
          ))}
        </>
      )}

      {!!selectedTemplate && (
        <View style={styles.card}>
          <Text style={styles.label}>Dados obrigatorios do veiculo</Text>
          <Text style={{ fontWeight: "800", fontSize: 16, marginBottom: 8 }}>{selectedTemplate.name}</Text>
          <TextInput
            autoCapitalize="characters"
            placeholder="Placa"
            style={styles.input}
            value={vehicleForm.plate}
            onChangeText={(plate) => setVehicleForm({ ...vehicleForm, plate })}
          />
          <TextInput
            placeholder="Marca"
            style={styles.input}
            value={vehicleForm.brand}
            onChangeText={(brand) => setVehicleForm({ ...vehicleForm, brand })}
          />
          <TextInput
            placeholder="Modelo"
            style={styles.input}
            value={vehicleForm.model}
            onChangeText={(model) => setVehicleForm({ ...vehicleForm, model })}
          />
          <TextInput
            keyboardType="number-pad"
            placeholder="Ano"
            style={styles.input}
            value={vehicleForm.year}
            onChangeText={(year) => setVehicleForm({ ...vehicleForm, year })}
          />
          <TouchableOpacity style={styles.button} onPress={startWithNewVehicle} disabled={savingVehicle}>
            <Text style={styles.buttonText}>{savingVehicle ? "Salvando..." : "Salvar veiculo e iniciar checklist"}</Text>
          </TouchableOpacity>
        </View>
      )}
      <Text style={styles.label}>Meus rascunhos, pendentes e finalizados</Text>
      <View style={{ flexDirection: "row", gap: 8, marginBottom: 10 }}>
        <TouchableOpacity style={[styles.option, submissionFilter === "all" && styles.optionActive, { flex: 1 }]} onPress={() => setSubmissionFilter("all")}>
          <Text style={[styles.optionText, submissionFilter === "all" && styles.optionTextActive]}>Todos</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.option, submissionFilter === "finished" && styles.optionActive, { flex: 1 }]} onPress={() => setSubmissionFilter("finished")}>
          <Text style={[styles.optionText, submissionFilter === "finished" && styles.optionTextActive]}>Finalizados</Text>
        </TouchableOpacity>
      </View>
      {visibleSubmissions.map((item) => (
        <View key={item.id} style={styles.card}>
          <Text style={{ fontWeight: "800" }}>{item.checklist_name}</Text>
          <Text>{item.plate || "Sem veiculo"} - {statusLabels[item.status] || item.status}</Text>
          {!!item.report_number && <Text style={{ color: "#52525b", marginTop: 4 }}>{item.report_number}</Text>}
          <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
            <TouchableOpacity style={[styles.darkButton, { flex: 1 }]} onPress={() => openSubmission(item, "view")}>
              <Text style={styles.darkButtonText}>Visualizar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.button, { flex: 1 }]} onPress={() => openSubmission(item, "edit")}>
              <Text style={styles.buttonText}>Editar</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}
      {!loading && !visibleSubmissions.length && (
        <View style={styles.card}>
          <Text>Nenhum checklist encontrado neste filtro.</Text>
        </View>
      )}
    </ScrollView>
  );
}
