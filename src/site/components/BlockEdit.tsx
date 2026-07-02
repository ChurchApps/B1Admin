import { useEffect } from "react";
import { Alert, FormControl, Grid, InputLabel, MenuItem, Select, TextField } from "@mui/material";
import { useForm, Controller } from "react-hook-form";
import { UserHelper, Permissions, ApiHelper, Locale } from "@churchapps/apphelper";
import { FormCard } from "../../components/ui";
import type { BlockInterface } from "../../helpers";

type Props = {
  block: BlockInterface;
  updatedCallback: (block: BlockInterface) => void;
};

type AnyRecord = Record<string, any>;

export function BlockEdit(props: Props) {
  "use no memo"; // compiler caches register() results, breaking RHF field re-registration after reset()
  const { control, register, handleSubmit, reset, setError, formState } = useForm<AnyRecord>({ defaultValues: { name: "", blockType: "elementBlock" } });
  const e = formState.errors as any;
  const summaryErrors: string[] = [];
  if (e.name?.message) summaryErrors.push(e.name.message);
  if (e.root?.message) summaryErrors.push(e.root.message);

  const handleCancel = () => props.updatedCallback(props.block);

  const onValid = (values: AnyRecord) => {
    if (!UserHelper.checkAccess(Permissions.contentApi.content.edit)) {
      setError("root", { message: Locale.label("site.blockEdit.unauthorizedCreate") });
      return;
    }
    const block = { ...props.block, ...values };
    ApiHelper.post("/blocks", [block], "ContentApi").then((data: any) => {
      props.updatedCallback(data);
    });
  };

  const handleDelete = () => {
    if (!UserHelper.checkAccess(Permissions.contentApi.content.edit)) {
      setError("root", { message: Locale.label("site.blockEdit.unauthorizedDelete") });
      return;
    }
    if (window.confirm(Locale.label("site.blocks.confirmDelete"))) {
      ApiHelper.delete("/blocks/" + props.block.id.toString(), "ContentApi").then(() => props.updatedCallback(null));
    }
  };

  useEffect(() => { reset({ name: props.block?.name || "", blockType: props.block?.blockType || "elementBlock" }); }, [props.block, reset]);

  if (!props.block) return <></>;
  return (
    <>
      <FormCard id="blockDetailsBox" title={Locale.label("site.blocks.editBlock")} icon="school" onSave={handleSubmit(onValid)} onCancel={handleCancel} onDelete={handleDelete} data-testid="edit-block-inputbox">
        {summaryErrors.length > 0 && <Alert severity="error" sx={{ mb: 2 }}>{summaryErrors.map((msg) => <div key={msg}>{msg}</div>)}</Alert>}
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField fullWidth label={Locale.label("site.blockEdit.name")} placeholder={Locale.label("placeholders.block.name")} data-testid="block-name-input" aria-label="Block name" error={!!e.name} helperText={e.name?.message} {...register("name", { required: Locale.label("site.blockEdit.errName") })} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <FormControl fullWidth>
              <InputLabel>{Locale.label("site.blockEdit.blockType")}</InputLabel>
              <Controller name="blockType" control={control} render={({ field }) => (
                <Select {...field} fullWidth label={Locale.label("site.blockEdit.blockType")} data-testid="block-type-select" aria-label="Select block type">
                  <MenuItem value="elementBlock" data-testid="block-type-element" aria-label="Element block type">{Locale.label("site.blockEdit.elementBlock")}</MenuItem>
                  <MenuItem value="sectionBlock" data-testid="block-type-section" aria-label="Section block type">{Locale.label("site.blockEdit.sectionBlock")}</MenuItem>
                </Select>
              )} />
            </FormControl>
          </Grid>
        </Grid>
      </FormCard>
    </>
  );
}
