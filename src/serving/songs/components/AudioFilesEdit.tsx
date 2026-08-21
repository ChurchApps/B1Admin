import { useState } from "react";
import { Locale } from "@churchapps/apphelper";
import { FormCard } from "../../../components/ui";
import { CustomFileUpload } from "../../../site/components/CustomFileUpload";

// Planning Center's player-supported formats; WAV is declined to keep the free storage tier usable.
const AUDIO_ACCEPT = "audio/mpeg,audio/mp4,audio/x-m4a,audio/aac,.mp3,.m4a,.aac";

interface Props {
  arrangementId: string;
  onSave: () => void;
  onCancel: () => void;
}

export const AudioFilesEdit = (props: Props) => {
  const [pendingSave, setPendingSave] = useState(false);

  const handleSaved = () => {
    setPendingSave(false);
    props.onSave();
  };

  return (
    <FormCard
      title={Locale.label("songs.audio.upload") || "Upload Audio"}
      icon="audio_file"
      onSave={() => setPendingSave(true)}
      onCancel={props.onCancel}
      isSubmitting={pendingSave}
    >
      <CustomFileUpload contentType="arrangement" contentId={props.arrangementId} accept={AUDIO_ACCEPT} pendingSave={pendingSave} saveCallback={handleSaved} errorCallback={() => setPendingSave(false)} />
    </FormCard>
  );
};
