import { Calendar } from "primereact/calendar"
import { classNames } from "primereact/utils"
import React from "react"
import { Controller } from "react-hook-form"

const CDatePicker = ({
  control,
  name = "",
  disabled = false,
  required = false,
  showTime = false,
  showIcon = false,
  dateFormat = "dd-M-yy",
  onChange = () => null,
  selectOtherMonths = true,
}) => {
  return (
    <Controller
      name={name}
      control={control}
      rules={{ required }}
      render={({ field, fieldState }) => (
        <>
          <Calendar
            inputId={field.name}
            value={field.value || new Date()}
            onChange={(e) => {
              field.onChange(e)
              if (onChange) {
                onChange(e)
              }
            }}
            dateFormat={dateFormat}
            style={{ width: "100%" }}
            className={classNames({ "p-invalid": fieldState.error })}
            showTime={showTime}
            showIcon={showIcon}
            hourFormat="12"
            disabled={disabled}
            placeholder="Select a date"
            selectOtherMonths={selectOtherMonths}
          />
        </>
      )}
    />
  )
}

export default CDatePicker
