import React, { useEffect, useRef, useState } from "react";
import { Image, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { WebView } from "react-native-webview";
import { api, getApiUrl, uploadPhoto, uploadSignature } from "../api/client";
import { styles } from "../styles";

export function FillScreen({ token, context, onBack }) {
  const [template, setTemplate] = useState(null);
  const [submission, setSubmission] = useState(null);
  const [answers, setAnswers] = useState({});
  const [photos, setPhotos] = useState({});
  const [error, setError] = useState("");
  const readOnly = context.mode === "view";

  useEffect(() => {
    async function boot() {
      if (context.submissionId) {
        const loaded = await api(`/submissions/${context.submissionId}`, token);
        const apiUrl = await getApiUrl();
        setTemplate(loaded.template);
        setSubmission(loaded);
        setAnswers(Object.fromEntries((loaded.answers || []).map((answer) => [answer.question_id, {
          question_id: answer.question_id,
          value: normalizeAnswerValue(answer.value),
          observation: answer.observation || ""
        }])));
        setPhotos(groupPhotosByQuestion(loaded.attachments || [], apiUrl));
        return;
      }

      const loadedTemplate = await api(`/checklists/${context.templateId}`, token);
      const created = await api("/submissions", token, {
        method: "POST",
        body: JSON.stringify({ template_id: context.templateId, vehicle_id: context.vehicleId })
      });
      setTemplate(loadedTemplate);
      setSubmission(created);
    }
    boot().catch((err) => setError(err.message));
  }, [context.submissionId, context.templateId, context.vehicleId, token]);

  function setAnswer(questionId, value, observation) {
    if (readOnly) return;
    setAnswers({ ...answers, [questionId]: { question_id: questionId, value, observation: observation ?? answers[questionId]?.observation } });
  }

  async function takePhoto(questionId) {
    if (readOnly) return;
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

  async function save(status = submission.status || "draft", nextAnswers = answers) {
    if (readOnly) return submission;
    const saved = await api(`/submissions/${submission.id}/answers`, token, {
      method: "PUT",
      body: JSON.stringify({ status, answers: Object.values(nextAnswers) })
    });
    setSubmission(saved);
    return saved;
  }

  async function saveDrawnSignature(questionId, imageBase64) {
    if (readOnly) return;
    const nextAnswers = {
      ...answers,
      [questionId]: { question_id: questionId, value: "assinatura_coletada", observation: answers[questionId]?.observation }
    };
    setAnswers(nextAnswers);
    try {
      const savedSubmission = await save(submission.status || "draft", nextAnswers);
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
    if (readOnly) return;
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
  const allQuestions = template.categories.flatMap((category) => category.questions || []);
  const totalQuestions = allQuestions.filter((question) => question.response_type !== "informativo").length;
  const answeredQuestions = allQuestions.filter((question) => {
    if (question.response_type === "informativo") return false;
    if (question.response_type === "foto" || question.response_type === "multiplas_fotos") return (photos[question.id] || []).length > 0;
    return !!answers[question.id]?.value;
  }).length;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.fillContent}>
      <View style={styles.fillHeader}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}><Text style={styles.backButtonText}>Voltar</Text></TouchableOpacity>
        <Text style={styles.fillTitle}>{template.name}</Text>
        {!!context.vehicle && <Text style={styles.vehicleText}>{context.vehicle.plate} - {context.vehicle.brand} {context.vehicle.model}</Text>}
        {!!submission.report_number && <Text style={styles.progressText}>{submission.report_number} - {readOnly ? "Visualizacao" : "Edicao"}</Text>}
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${totalQuestions ? (answeredQuestions / totalQuestions) * 100 : 0}%` }]} />
        </View>
        <Text style={styles.progressText}>{answeredQuestions} de {totalQuestions} perguntas respondidas</Text>
      </View>
      {!!error && <Text style={styles.error}>{error}</Text>}
      {template.categories.map((category, categoryIndex) => (
        <View key={category.id} style={styles.categorySection}>
          <View style={styles.categoryHeader}>
            <Text style={styles.categoryNumber}>{String(categoryIndex + 1).padStart(2, "0")}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.categoryTitle}>{category.title}</Text>
              {!!category.description && <Text style={styles.categoryDescription}>{category.description}</Text>}
            </View>
          </View>
          {category.questions.map((question, questionIndex) => (
            <Question
              key={question.id}
              question={question}
              index={questionIndex + 1}
              answer={answers[question.id]}
              setAnswer={setAnswer}
              takePhoto={takePhoto}
              photos={photos[question.id] || []}
              saveSignature={saveDrawnSignature}
              readOnly={readOnly}
            />
          ))}
        </View>
      ))}
      {!readOnly && (
        <>
          <TouchableOpacity style={styles.darkButton} onPress={() => save(submission.status || "draft")}><Text style={styles.darkButtonText}>Salvar alteracoes</Text></TouchableOpacity>
          <TouchableOpacity style={styles.button} onPress={finalize}><Text style={styles.buttonText}>Finalizar checklist</Text></TouchableOpacity>
        </>
      )}
    </ScrollView>
  );
}

function Question({ question, index, answer, setAnswer, takePhoto, photos, saveSignature, readOnly }) {
  const options = question.options || [];
  const textLike = ["texto_curto", "texto_longo", "numero", "data", "hora", "data_hora", "upload_arquivo"].includes(question.response_type);
  const mustJustifyWithPhoto = requiresPhotoJustification(answer, question);
  const expectsPhoto = mustJustifyWithPhoto || question.requires_photo || question.response_type === "foto" || question.response_type === "multiplas_fotos";
  const isAnswered = question.response_type === "informativo" || !!answer?.value || photos.length > 0;
  return (
    <View style={[styles.questionCard, isAnswered && styles.questionCardDone]}>
      <View style={styles.questionTopline}>
        <Text style={styles.questionIndex}>{String(index).padStart(2, "0")}</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.questionTitle}>{question.title}</Text>
          {!!question.description && <Text style={styles.questionDescription}>{question.description}</Text>}
        </View>
        <Text style={[styles.statusPill, isAnswered ? styles.statusDone : styles.statusPending]}>{isAnswered ? "Ok" : "Pendente"}</Text>
      </View>
      <View style={styles.badgeRow}>
        {question.required && <Text style={styles.metaBadge}>Obrigatoria</Text>}
        {expectsPhoto && <Text style={styles.metaBadge}>Foto</Text>}
        {question.response_type === "assinatura" && <Text style={styles.metaBadge}>Assinatura</Text>}
        {question.observation_required && <Text style={styles.metaBadge}>Observacao</Text>}
      </View>
      {question.response_type === "informativo" ? null : question.response_type === "assinatura" ? (
        <SignaturePad value={answer?.value} onSave={(imageBase64) => saveSignature(question.id, imageBase64)} readOnly={readOnly} />
      ) : textLike ? (
        <TextInput editable={!readOnly} style={styles.input} value={String(answer?.value || "")} onChangeText={(value) => setAnswer(question.id, value)} multiline={question.response_type === "texto_longo"} placeholder="Resposta" />
      ) : options.length ? (
        <View style={styles.optionGroup}>
          {options.map((option) => (
            <TouchableOpacity key={option.value} disabled={readOnly} style={[styles.option, answer?.value === option.value && styles.optionActive]} onPress={() => setAnswer(question.id, option.value)}>
              <Text style={[styles.optionText, answer?.value === option.value && styles.optionTextActive]}>{option.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      ) : (
        <Text style={styles.emptyState}>Sem respostas configuradas para esta pergunta.</Text>
      )}
      {question.allows_observation && <TextInput editable={!readOnly} placeholder="Observacao" style={styles.input} value={answer?.observation || ""} onChangeText={(value) => setAnswer(question.id, answer?.value || "", value)} multiline />}
      {expectsPhoto && !readOnly && <TouchableOpacity style={styles.darkButton} onPress={() => takePhoto(question.id)}><Text style={styles.darkButtonText}>{mustJustifyWithPhoto ? "Tirar foto de justificativa" : photos.length ? "Adicionar outra foto" : "Tirar foto"}</Text></TouchableOpacity>}
      {!!photos.length && (
        <View style={styles.photoStrip}>
          {photos.map((uri) => <Image key={uri} source={{ uri }} style={styles.photoPreview} />)}
        </View>
      )}
    </View>
  );
}

function SignaturePad({ value, onSave, readOnly }) {
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
          disabled={readOnly}
          style={[styles.darkButton, { flex: 1 }]}
          onPress={() => {
            setSaved(false);
            webViewRef.current?.injectJavaScript("window.clearSignature(); true;");
          }}
        >
          <Text style={styles.darkButtonText}>Limpar</Text>
        </TouchableOpacity>
        <TouchableOpacity
          disabled={readOnly}
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

function normalizeAnswerValue(value) {
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function groupPhotosByQuestion(attachments, apiUrl) {
  return attachments
    .filter((item) => item.kind === "photo" && item.question_id)
    .reduce((groups, item) => {
      const uri = `${apiUrl}/${String(item.file_path || "").replace(/^\/+/, "")}`;
      return { ...groups, [item.question_id]: [...(groups[item.question_id] || []), uri] };
    }, {});
}

function requiresPhotoJustification(answer, question) {
  const answerText = normalizeAnswerText(answer?.value);
  const option = (question.options || []).find((item) => normalizeAnswerText(item.value) === answerText);
  const optionText = normalizeAnswerText(`${option?.value || ""} ${option?.label || ""}`);
  const combined = `${answerText} ${optionText}`.trim();
  return combined === "nao" || combined.includes("nao conforme") || combined.includes("nao_conforme");
}
