import React, { useEffect, useRef, useState } from "react";
import { Image, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { WebView } from "react-native-webview";
import { api, uploadPhoto, uploadSignature } from "../api/client";
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
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) return setError("Permissao da camera nao liberada");
    const picked = await ImagePicker.launchCameraAsync({ quality: 0.7, allowsEditing: false });
    if (picked.canceled) return;
    const uri = picked.assets[0].uri;
    setPhotos((current) => ({ ...current, [questionId]: [...(current[questionId] || []), uri] }));
    let location = null;
    try {
      await Location.requestForegroundPermissionsAsync();
      location = await Location.getCurrentPositionAsync({});
    } catch {}
    try {
      await uploadPhoto(submission.id, questionId, uri, token, location);
      setError("");
    } catch (err) {
      setPhotos((current) => ({ ...current, [questionId]: (current[questionId] || []).filter((item) => item !== uri) }));
      setError(err.message);
    }
  }

  async function save(status = "draft", nextAnswers = answers) {
    const saved = await api(`/submissions/${submission.id}/answers`, token, {
      method: "PUT",
      body: JSON.stringify({ status, answers: Object.values(nextAnswers) })
    });
    setSubmission(saved);
    return saved;
  }

  async function saveDrawnSignature(questionId, imageBase64) {
    const nextAnswers = {
      ...answers,
      [questionId]: { question_id: questionId, value: "assinatura_coletada", observation: answers[questionId]?.observation }
    };
    setAnswers(nextAnswers);
    try {
      const savedSubmission = await save("draft", nextAnswers);
      const savedAnswer = (savedSubmission.answers || []).find((item) => item.question_id === questionId);
      await uploadSignature(submission.id, savedAnswer?.id, imageBase64, token);
      setError("");
    } catch (err) {
      setError(err.message);
    }
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
            <Question
              key={question.id}
              question={question}
              answer={answers[question.id]}
              setAnswer={setAnswer}
              takePhoto={takePhoto}
              photos={photos[question.id] || []}
              saveSignature={saveDrawnSignature}
            />
          ))}
        </View>
      ))}
      <TouchableOpacity style={styles.darkButton} onPress={() => save("draft")}><Text style={styles.darkButtonText}>Salvar rascunho</Text></TouchableOpacity>
      <TouchableOpacity style={styles.button} onPress={finalize}><Text style={styles.buttonText}>Finalizar checklist</Text></TouchableOpacity>
    </ScrollView>
  );
}

function Question({ question, answer, setAnswer, takePhoto, photos, saveSignature }) {
  const options = question.options?.length ? question.options : defaultOptions(question.response_type);
  const textLike = ["texto_curto", "texto_longo", "numero", "data", "hora", "data_hora", "upload_arquivo"].includes(question.response_type);
  const mustJustifyWithPhoto = requiresPhotoJustification(answer, question);
  return (
    <View style={{ marginTop: 14 }}>
      <Text style={{ fontWeight: "800" }}>{question.title}{question.required ? " *" : ""}</Text>
      {!!question.description && <Text>{question.description}</Text>}
      {question.response_type === "informativo" ? null : question.response_type === "assinatura" ? (
        <SignaturePad value={answer?.value} onSave={(imageBase64) => saveSignature(question.id, imageBase64)} />
      ) : textLike ? (
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

function SignaturePad({ value, onSave }) {
  const [saved, setSaved] = useState(value === "assinatura_coletada");
  const webViewRef = useRef(null);
  const html = `
    <!doctype html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
        <style>
          html, body { margin: 0; padding: 0; overflow: hidden; background: #fff; touch-action: none; }
          canvas { width: 100vw; height: 190px; display: block; background: #fff; }
        </style>
      </head>
      <body>
        <canvas id="signature"></canvas>
        <script>
          const canvas = document.getElementById("signature");
          const ctx = canvas.getContext("2d");
          let drawing = false;
          let hasInk = false;

          function resize() {
            const ratio = window.devicePixelRatio || 1;
            canvas.width = Math.floor(window.innerWidth * ratio);
            canvas.height = Math.floor(190 * ratio);
            ctx.scale(ratio, ratio);
            ctx.lineWidth = 3;
            ctx.lineCap = "round";
            ctx.lineJoin = "round";
            ctx.strokeStyle = "#111111";
          }

          function point(event) {
            const touch = event.touches ? event.touches[0] : event;
            const rect = canvas.getBoundingClientRect();
            return { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
          }

          function start(event) {
            event.preventDefault();
            drawing = true;
            const current = point(event);
            ctx.beginPath();
            ctx.moveTo(current.x, current.y);
          }

          function move(event) {
            if (!drawing) return;
            event.preventDefault();
            const current = point(event);
            ctx.lineTo(current.x, current.y);
            ctx.stroke();
            hasInk = true;
          }

          function end(event) {
            event.preventDefault();
            drawing = false;
          }

          window.clearSignature = function () {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            hasInk = false;
          };

          window.saveSignature = function () {
            if (!hasInk) {
              window.ReactNativeWebView.postMessage(JSON.stringify({ type: "empty" }));
              return;
            }
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: "signature", image: canvas.toDataURL("image/png") }));
          };

          resize();
          canvas.addEventListener("touchstart", start, { passive: false });
          canvas.addEventListener("touchmove", move, { passive: false });
          canvas.addEventListener("touchend", end, { passive: false });
          canvas.addEventListener("mousedown", start);
          canvas.addEventListener("mousemove", move);
          canvas.addEventListener("mouseup", end);
        </script>
      </body>
    </html>
  `;

  return (
    <View>
      <View style={styles.signatureBox}>
        <WebView
          ref={webViewRef}
          originWhitelist={["*"]}
          source={{ html }}
          javaScriptEnabled
          scrollEnabled={false}
          onMessage={(event) => {
            const data = JSON.parse(event.nativeEvent.data);
            if (data.type === "signature") {
              setSaved(true);
              onSave(data.image);
            }
            if (data.type === "empty") setSaved(false);
          }}
        />
      </View>
      <View style={{ flexDirection: "row", gap: 8 }}>
        <TouchableOpacity
          style={[styles.darkButton, { flex: 1 }]}
          onPress={() => {
            setSaved(false);
            webViewRef.current?.injectJavaScript("window.clearSignature(); true;");
          }}
        >
          <Text style={styles.darkButtonText}>Limpar</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, { flex: 1 }]}
          onPress={() => webViewRef.current?.injectJavaScript("window.saveSignature(); true;")}
        >
          <Text style={styles.buttonText}>{saved ? "Assinada" : "Salvar assinatura"}</Text>
        </TouchableOpacity>
      </View>
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
