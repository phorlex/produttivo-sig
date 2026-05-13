import React, { useEffect, useState } from "react";
import { Image, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { api, uploadPhoto } from "../api/client";
import { styles } from "../styles";

export function FillScreen({ token, context, onBack }) {
  const [template, setTemplate] = useState(null);
  const [submission, setSubmission] = useState(null);
  const [answers, setAnswers] = useState({});
  const [photos, setPhotos] = useState({});
  const [error, setError] = useState("");

  useEffect(() => {
    async function boot() {
      const loadedTemplate = await api(`/checklists/${context.templateId}`, token);
      const created = await api("/submissions", token, {
        method: "POST",
        body: JSON.stringify({ template_id: context.templateId, vehicle_id: context.vehicleId })
      });
      setTemplate(loadedTemplate);
      setSubmission(created);
    }
    boot().catch((err) => setError(err.message));
  }, [context.templateId, context.vehicleId, token]);

  function setAnswer(questionId, value, observation) {
    setAnswers({ ...answers, [questionId]: { question_id: questionId, value, observation: observation ?? answers[questionId]?.observation } });
  }

  async function takePhoto(questionId) {
    await ImagePicker.requestCameraPermissionsAsync();
    const picked = await ImagePicker.launchCameraAsync({ quality: 0.7 });
    if (picked.canceled) return;
    let location = null;
    try {
      await Location.requestForegroundPermissionsAsync();
      location = await Location.getCurrentPositionAsync({});
    } catch {}
    await uploadPhoto(submission.id, questionId, picked.assets[0].uri, token, location);
    setPhotos({ ...photos, [questionId]: [...(photos[questionId] || []), picked.assets[0].uri] });
  }

  async function save(status = "draft") {
    await api(`/submissions/${submission.id}/answers`, token, {
      method: "PUT",
      body: JSON.stringify({ status, answers: Object.values(answers) })
    });
  }

  function validateLocal() {
    const errors = [];
    for (const category of template.categories) {
      for (const question of category.questions) {
        const answer = answers[question.id];
        if (question.required && question.response_type !== "informativo" && !answer?.value) errors.push(`${question.title}: campo obrigatorio`);
        if (question.requires_photo && (photos[question.id] || []).length < Math.max(1, Number(question.min_photos || 0))) errors.push(`${question.title}: foto obrigatoria`);
        if (requiresPhotoJustification(answer, question) && (photos[question.id] || []).length < 1) errors.push(`${question.title}: resposta Nao/Nao conforme exige foto`);
        if (question.observation_required && !answer?.observation) errors.push(`${question.title}: observacao obrigatoria`);
      }
    }
    return errors;
  }

  async function finalize() {
    const errors = validateLocal();
    if (errors.length) return setError(errors.join("\n"));
    try {
      await save("pending");
      await api(`/submissions/${submission.id}/finalize`, token, { method: "POST" });
      onBack();
    } catch (err) {
      setError(err.message);
    }
  }

  if (!template || !submission) return <View style={styles.container}><Text>Carregando checklist...</Text></View>;

  return (
    <ScrollView style={styles.container}>
      <TouchableOpacity onPress={onBack}><Text style={styles.link}>Voltar</Text></TouchableOpacity>
      <Text style={styles.title}>{template.name}</Text>
      {!!context.vehicle && <Text>{context.vehicle.plate} - {context.vehicle.brand} {context.vehicle.model}</Text>}
      {!!error && <Text style={styles.error}>{error}</Text>}
      {template.categories.map((category) => (
        <View key={category.id} style={styles.card}>
          <Text style={{ fontSize: 18, fontWeight: "900" }}>{category.title}</Text>
          {category.questions.map((question) => (
            <Question key={question.id} question={question} answer={answers[question.id]} setAnswer={setAnswer} takePhoto={takePhoto} photos={photos[question.id] || []} />
          ))}
        </View>
      ))}
      <TouchableOpacity style={styles.darkButton} onPress={() => save("draft")}><Text style={styles.darkButtonText}>Salvar rascunho</Text></TouchableOpacity>
      <TouchableOpacity style={styles.button} onPress={finalize}><Text style={styles.buttonText}>Finalizar checklist</Text></TouchableOpacity>
    </ScrollView>
  );
}

function Question({ question, answer, setAnswer, takePhoto, photos }) {
  const options = question.options?.length ? question.options : defaultOptions(question.response_type);
  const textLike = ["texto_curto", "texto_longo", "numero", "data", "hora", "data_hora", "assinatura", "upload_arquivo"].includes(question.response_type);
  const mustJustifyWithPhoto = requiresPhotoJustification(answer, question);
  return (
    <View style={{ marginTop: 14 }}>
      <Text style={{ fontWeight: "800" }}>{question.title}{question.required ? " *" : ""}</Text>
      {!!question.description && <Text>{question.description}</Text>}
      {question.response_type === "informativo" ? null : textLike ? (
        <TextInput style={styles.input} value={String(answer?.value || "")} onChangeText={(value) => setAnswer(question.id, value)} multiline={question.response_type === "texto_longo"} />
      ) : (
        options.map((option) => (
          <TouchableOpacity key={option.value} style={[styles.option, answer?.value === option.value && styles.optionActive]} onPress={() => setAnswer(question.id, option.value)}>
            <Text>{option.label}</Text>
          </TouchableOpacity>
        ))
      )}
      {question.allows_observation && <TextInput placeholder="Observacao" style={styles.input} value={answer?.observation || ""} onChangeText={(value) => setAnswer(question.id, answer?.value || "", value)} />}
      {(mustJustifyWithPhoto || question.requires_photo || question.response_type === "foto" || question.response_type === "multiplas_fotos") && <TouchableOpacity style={styles.darkButton} onPress={() => takePhoto(question.id)}><Text style={styles.darkButtonText}>{mustJustifyWithPhoto ? "Tirar foto de justificativa" : "Tirar foto"}</Text></TouchableOpacity>}
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 }}>{photos.map((uri) => <Image key={uri} source={{ uri }} style={{ width: 80, height: 80, borderRadius: 6 }} />)}</View>
    </View>
  );
}

function normalizeAnswerText(value) {
  if (value === undefined || value === null) return "";
  const raw = typeof value === "object" ? `${value.value || ""} ${value.label || ""}` : String(value);
  return raw.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

function requiresPhotoJustification(answer, question) {
  const answerText = normalizeAnswerText(answer?.value);
  const option = (question.options || []).find((item) => normalizeAnswerText(item.value) === answerText);
  const optionText = normalizeAnswerText(`${option?.value || ""} ${option?.label || ""}`);
  const combined = `${answerText} ${optionText}`.trim();
  return combined === "nao" || combined.includes("nao conforme") || combined.includes("nao_conforme");
}

function defaultOptions(type) {
  if (type === "sim_nao") return [{ label: "Sim", value: "sim" }, { label: "Nao", value: "nao" }];
  if (type === "checklist_simples") return [{ label: "Marcado", value: "marcado" }];
  return [{ label: "Conforme", value: "conforme" }, { label: "Nao conforme", value: "nao_conforme" }, { label: "N/A", value: "na" }];
}
