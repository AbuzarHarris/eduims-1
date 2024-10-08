import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Route, Routes, useNavigate, useParams } from "react-router-dom"
import { FilterMatchMode, FilterOperator } from "primereact/api"
import React, { useContext, useEffect, useRef, useState } from "react"
import { CustomSpinner } from "../../components/CustomSpinner"
import { Button } from "primereact/button"
import { DataTable } from "primereact/datatable"
import { Column } from "primereact/column"
import ActionButtons from "../../components/ActionButtons"
import { useForm, FormProvider, Controller } from "react-hook-form"
import ButtonToolBar from "../../components/ActionsToolbar"

import { AuthContext, useUserData } from "../../context/AuthContext"
import {
  addLeadIntroductionOnAction,
  addNewLeadIntroduction,
  deleteLeadIntroductionByID,
  fetchAllLeadIntroductions,
  fetchLeadIntroductionById,
  markIncentiveAsPaid,
} from "../../api/LeadIntroductionData"
import { ROUTE_URLS, QUERY_KEYS, MENU_KEYS } from "../../utils/enums"
import { LeadsIntroductionFormComponent } from "../../hooks/ModalHooks/useLeadsIntroductionModalHook"
import { Dialog } from "primereact/dialog"
import {
  useAllDepartmentsSelectData,
  useAllUsersSelectData,
  useProductsInfoSelectData,
} from "../../hooks/SelectData/useSelectData"
import CDropdown from "../../components/Forms/CDropdown"
import NumberInput from "../../components/Forms/NumberInput"
import { Calendar } from "primereact/calendar"
import { classNames } from "primereact/utils"
import { Tag } from "primereact/tag"
import { toast } from "react-toastify"
import { CIconButton } from "../../components/Buttons/CButtons"
import useConfirmationModal from "../../hooks/useConfirmationModalHook"
import AccessDeniedPage from "../../components/AccessDeniedPage"
import LeadsIntroductionViewer, {
  LeadsIntroductionViewerDetail,
  LeadsViewerDetailOnLeadsForm,
} from "../LeadsIntroductionViewer/LeadsIntroductionViewer"
import LeadsComments from "./LeadsComments"
import { decryptID, encryptID } from "../../utils/crypto"
import {
  SingleFileUploadField,
  TextAreaField,
} from "../../components/Forms/form"

import { Dropdown } from "primereact/dropdown"
import { checkForUserRightsAsync } from "../../api/MenusData"
import {
  FormColumn,
  FormLabel,
  FormRow,
} from "../../components/Layout/LayoutComponents"
import { DetailPageTilteAndActionsComponent } from "../../components"
import {
  formatDateWithSymbol,
  ShowSuccessToast,
} from "../../utils/CommonFunctions"
import { Filter, SortAsc, SortDesc } from "lucide-react"
import { useAppConfigurataionProvider } from "../../context/AppConfigurationContext"
import { usePreviousAndNextID } from "../../hooks/api/usePreviousAndNextIDHook"
import { displayYesNoDialog } from "../../utils/helpers"
import { SEVERITIES } from "../../utils/CONSTANTS"
import { confirmDialog } from "primereact/confirmdialog"

let parentRoute = ROUTE_URLS.LEAD_INTRODUCTION_ROUTE
let editRoute = `${parentRoute}/edit/`
let newRoute = `${parentRoute}/new`
let viewRoute = `${parentRoute}/`
let queryKey = QUERY_KEYS.LEAD_INTRODUCTION_QUERY_KEY
let IDENTITY = "LeadIntroductionID"

const getSeverity = (status) => {
  switch (status?.toLowerCase().replaceAll(" ", "")) {
    case "newlead":
      return "#34568B"
    case "closed":
      return "linear-gradient(90deg, rgba(200, 0, 0, 1) 0%, rgba(128, 0, 0, 1) 100%)"
    case "quoted":
      return "#22C55E"
    case "finalized":
      return "#B35DF7"
    case "forwarded":
      return "#9EBBF9"
    case "acknowledged":
      return "#FCB382"
    case "meetingdone":
      return "#FF6F61"
    case "pending":
      return "#DFCFBE"
  }
}

export default function LeadIntroduction() {
  const [userRights, setUserRights] = useState([])

  const user = useUserData()

  const { data: rights } = useQuery({
    queryKey: ["formRights"],
    queryFn: () =>
      checkForUserRightsAsync({
        MenuKey: MENU_KEYS.LEADS.LEAD_INTRODUCTION_FORM_KEY,
        LoginUserID: user?.userID,
      }),
    initialData: [],
  })

  useEffect(() => {
    if (rights) {
      setUserRights(rights)
    }
  }, [rights])

  return (
    <Routes>
      <Route
        path={`/leadcomments/:LeadIntroductionID`}
        element={<LeadsComments />}
      />
      {userRights && userRights[0]?.ShowForm ? (
        <>
          <Route
            index
            element={<LeadIntroductionDetail userRights={userRights} />}
          />

          <Route
            path={`/leadsview/:LeadIntroductionID`}
            element={<LeadsIntroductionViewer />}
          />

          <Route
            path={`/leadsview/detail/:LeadIntroductionID/:Type/:LeadIntroductionDetailID`}
            element={<LeadsIntroductionViewerDetail />}
          />
          <Route
            path={`:${IDENTITY}`}
            element={
              <LeadIntroductionForm
                key={"LeadIntroductionViewRoute"}
                mode={"view"}
                userRights={userRights}
              />
            }
          />
          <Route
            path={`edit/:${IDENTITY}`}
            element={
              <>
                {userRights[0].RoleEdit ? (
                  <>
                    <LeadIntroductionForm
                      key={"LeadIntroductionEditRoute"}
                      mode={"edit"}
                      userRights={userRights}
                    />
                  </>
                ) : (
                  <AccessDeniedPage />
                )}
              </>
            }
          />

          <>
            <Route
              path={`new`}
              element={
                <>
                  {userRights[0].RoleNew ? (
                    <>
                      <LeadIntroductionForm
                        key={"LeadIntroductionNewRoute"}
                        mode={"new"}
                        userRights={userRights}
                      />
                    </>
                  ) : (
                    <>
                      <AccessDeniedPage />
                    </>
                  )}
                </>
              }
            />
          </>
        </>
      ) : (
        <Route
          path="*"
          element={
            <>
              <AccessDeniedPage />
            </>
          }
        />
      )}
    </Routes>
  )
}

export function LeadIntroductionDetail({
  ShowMetaDeta = true,
  Rows = 10,
  userRights,
}) {
  document.title = ShowMetaDeta ? "Lead Introductions" : "Leads Dashboard"

  const queryClient = useQueryClient()
  const navigate = useNavigate()

  const { showDeleteDialog, showEditDialog } = useConfirmationModal({
    handleDelete,
    handleEdit,
  })

  const [filters, setFilters] = useState({
    Status: { value: null, matchMode: FilterMatchMode.EQUALS },
    VoucherDate: {
      operator: FilterOperator.AND,
      constraints: [{ value: null, matchMode: FilterMatchMode.DATE_IS }],
    },
    CompanyName: { value: null, matchMode: FilterMatchMode.CONTAINS },
    ContactPersonName: { value: null, matchMode: FilterMatchMode.CONTAINS },
    ContactPersonMobileNo: { value: null, matchMode: FilterMatchMode.CONTAINS },
    DemoPersonName: { value: null, matchMode: FilterMatchMode.CONTAINS },
    FormatDemoDate: { value: null, matchMode: FilterMatchMode.CONTAINS },
  })

  const user = useUserData()

  const { data, isLoading, isFetching } = useQuery({
    queryKey: [queryKey],
    queryFn: () => fetchAllLeadIntroductions(user.userID),
    initialData: [],
    refetchOnWindowFocus: false,
  })

  const deleteMutation = useMutation({
    mutationFn: deleteLeadIntroductionByID,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [queryKey],
      })
    },
  })

  const incentiveMutation = useMutation({
    mutationFn: markIncentiveAsPaid,
    onSuccess: ({ success }) => {
      if (success) {
        ShowSuccessToast("Incentive paid successfully!")
        queryClient.invalidateQueries({
          queryKey: [QUERY_KEYS.LEADS_DEMO_DATA],
        })
        queryClient.invalidateQueries({
          queryKey: [QUERY_KEYS.LEAD_INTRODUCTION_QUERY_KEY],
        })
      }
    },
  })

  const confirmAcknowledge = (LeadIntroductionID) => {
    confirmDialog({
      header: "Incentive Paid Confirmation",
      message:
        "You are about to mark the incentive as paid. Are you sure you want to perform this action?",
      icon: "pi pi-exclamation-triangle",
      defaultFocus: "accept",
      accept: () => {
        incentiveMutation.mutate({
          LoginUserID: user.userID,
          LeadIntroductionID,
          Type: 1,
        })
      },
      reject: () => {},
    })
  }

  function handleDelete(id) {
    deleteMutation.mutate({ LeadIntroductionID: id, LoginUserID: user.userID })
  }

  function handleEdit(id) {
    navigate(editRoute + id)
  }

  function handleView(id) {
    navigate(parentRoute + "/" + id)
  }

  const actionBodyTemplate = (rowData) => {
    return (
      <React.Fragment>
        <div className="flex align-items-center justify-content-center gap-1  mx-1">
          <ForwardDialogComponent
            LeadIntroductionID={encryptID(rowData.LeadIntroductionID)}
          />
          <QuoteDialogComponent
            LeadIntroductionID={encryptID(rowData.LeadIntroductionID)}
          />
          <FinalizedDialogComponent
            LeadIntroductionID={encryptID(rowData.LeadIntroductionID)}
          />
          <ClosedDialogComponent
            LeadIntroductionID={encryptID(rowData.LeadIntroductionID)}
          />
          {rowData.IncentivePaid == false && (
            <>
              <CIconButton
                onClick={() =>
                  confirmAcknowledge(encryptID(rowData.LeadIntroductionID))
                }
                icon={"pi pi-credit-card"}
                severity="warning"
                tooltip="Incentive paid"
                toolTipPostion="left"
              />
            </>
          )}
        </div>
      </React.Fragment>
    )
  }
  const leftActionBodyTemplate = (rowData) => {
    return (
      <React.Fragment>
        <div style={{ display: "flex" }}>
          {ActionButtons({
            ID: encryptID(rowData.LeadIntroductionID),
            handleDelete: () =>
              showDeleteDialog(encryptID(rowData.LeadIntroductionID)),
            handleEdit: () =>
              showEditDialog(encryptID(rowData.LeadIntroductionID)),
            handleView: handleView,
            showEditButton: userRights[0]?.RoleEdit,
            showDeleteButton: userRights[0]?.RoleDelete,
            viewBtnRoute: viewRoute + encryptID(rowData.LeadIntroductionID),
          })}
          <div>
            <Button
              icon="pi pi-list"
              rounded
              outlined
              severity="help"
              tooltip="Timeline"
              tooltipOptions={{
                position: "right",
              }}
              onClick={() =>
                navigate(
                  ROUTE_URLS.GENERAL.LEADS_INTROUDCTION_VIEWER_ROUTE +
                    "/" +
                    encryptID(rowData.LeadIntroductionID)
                )
              }
              style={{
                padding: "1px 0px",
                fontSize: "small",
                width: "30px",
                height: "2rem",
                border: "none",
              }}
            />
            <CIconButton
              icon="pi pi-comments"
              severity="info"
              onClick={() =>
                navigate(
                  ROUTE_URLS.GENERAL.LEADS_INTROUDCTION_COMMENT_ROUTE +
                    "/" +
                    encryptID(rowData.LeadIntroductionID)
                )
              }
              tooltip="Comments"
            />
          </div>
        </div>
      </React.Fragment>
    )
  }

  const statusBodyTemplate = (rowData) => {
    return (
      <Tag
        value={rowData.Status}
        style={{ background: getSeverity(rowData.Status) }}
      />
    )
  }

  const statusItemTemplate = (option) => {
    return <Tag value={option} style={{ background: getSeverity(option) }} />
  }

  const [statuses] = useState([
    "New Lead",
    "Finalized",
    "Quoted",
    "Acknowledged",
    "Meeting Done",
    "Closed",
    "Forwarded",
  ])

  const statusRowFilterTemplate = (options) => {
    return (
      <Dropdown
        value={options.value}
        options={statuses}
        onChange={(e) => options.filterApplyCallback(e.value)}
        itemTemplate={statusItemTemplate}
        placeholder="Select One"
        className="p-column-filter"
        showClear
        style={{ minWidth: "7rem" }}
      />
    )
  }

  const dateFilterTemplate = (options) => {
    return (
      <Calendar
        value={options.value}
        onChange={(e) => {
          options.filterCallback(e.value, options.index)
        }}
        dateFormat="d-M-yy"
        placeholder="Filter by date"
      />
    )
  }

  const onRowClick = (e) => {
    if (e.originalEvent.target && e.originalEvent.target.nodeName === "TD") {
      navigate(viewRoute + encryptID(e?.data?.LeadIntroductionID))
    }
  }

  const dateBodyTemplate = (rowData) => {
    return formatDateWithSymbol(rowData.VoucherDate)
  }

  return (
    <div className="mt-4">
      {isLoading || isFetching ? (
        <>
          <CustomSpinner />
        </>
      ) : (
        <>
          {ShowMetaDeta && (
            <>
              <DetailPageTilteAndActionsComponent
                title="Lead Introductions"
                onAddNewClick={() => navigate(newRoute)}
                showAddNewButton={userRights[0]?.RoleNew}
                buttonLabel="Add New Lead"
              />
            </>
          )}
          <DataTable
            value={data || []}
            dataKey="LeadIntroductionID"
            paginator
            rows={Rows}
            showGridlines
            rowsPerPageOptions={[5, 10, 25, 50]}
            removableSort
            emptyMessage="No LeadIntroductions found!"
            filters={filters}
            filterDisplay="row"
            size="small"
            className={"thead-cell"}
            tableStyle={{ minWidth: "50rem" }}
            onRowClick={onRowClick}
          >
            <Column
              body={leftActionBodyTemplate}
              header="Actions"
              resizeable={false}
              style={{
                minWidth: "11rem",
                maxWidth: "11rem",
                width: "11rem",
              }}
            ></Column>
            <Column
              field="Status"
              filterPlaceholder="Search by status"
              sortable
              header="Current Status"
              filterMenuStyle={{ width: "8rem" }}
              style={{ minWidth: "8rem" }}
              body={statusBodyTemplate}
              filter
              showFilterMenu={false}
              filterElement={statusRowFilterTemplate}
            ></Column>
            <Column
              field="VoucherDate"
              header="Date"
              filterField="VoucherDate"
              dataType="date"
              style={{ minWidth: "8rem" }}
              filter
              body={dateBodyTemplate}
              filterElement={dateFilterTemplate}
              showFilterMenu={false}
              sortable
            ></Column>
            <Column
              field="CompanyName"
              filter
              filterPlaceholder="Search by firm"
              sortable
              showFilterMenu={false}
              header="Firm Name"
              pt={{
                bodyCell: {
                  style: {
                    maxWidth: "7rem",
                    textAlign: "start",
                  },
                },
              }}
            ></Column>
            <Column
              field="ContactPersonName"
              filter
              filterPlaceholder="Search by contact person name"
              sortable
              showFilterMenu={false}
              header="Contact Person Name"
            ></Column>
            <Column
              field="ContactPersonMobileNo"
              filter
              filterPlaceholder="Search by mobile"
              sortable
              showFilterMenu={false}
              header="Contact Person Mobile No"
            ></Column>
            <Column
              field="DemoPersonName"
              filter
              showFilterMenu={false}
              filterPlaceholder="Search by demo person"
              sortable
              header="Demo Person"
            ></Column>
            <Column
              field="FormatDemoDate"
              filter
              filterPlaceholder="Search by demo date"
              sortable
              showFilterMenu={false}
              header="Demo Date"
            ></Column>
            <Column
              body={actionBodyTemplate}
              style={{
                minWidth: ShowMetaDeta ? "4rem" : "2rem",
                width: ShowMetaDeta ? "4rem" : "2rem",
              }}
            ></Column>
          </DataTable>
        </>
      )}
    </div>
  )
}

function LeadIntroductionForm({ mode, userRights }) {
  document.title = "Lead Introduction Entry"

  const queryClient = useQueryClient()
  const { user } = useContext(AuthContext)

  const countryRef = useRef()
  const { pageTitles } = useAppConfigurataionProvider()
  const { render, setVisible, setLeadIntroductionID, setOnQuotationAdded } =
    useQuoteDialog()

  const navigate = useNavigate()
  const { LeadIntroductionID } = useParams()

  const { data: PreviousAndNextIDs } = usePreviousAndNextID({
    TableName: "gen_LeadIntroduction",
    IDName: IDENTITY,
    LoginUserID: user?.userID,
    RecordID: LeadIntroductionID,
  })

  const method = useForm({
    defaultValues: {
      CompanyName: "",
      CountryID: null,
      TehsilID: null,
      BusinessTypeID: null,
      BusinessNature: "",
      CompanyAddress: "",
      CompanyWebsite: "",
      ContactPersonName: "",
      ContactPersonMobileNo: "",
      ContactPersonWhatsAppNo: "",
      ContactPersonEmail: "",
      RequirementDetails: "",
      LeadSourceID: null,
      IsWANumberSameAsMobile: false,
      DemoDate: new Date(),
      DemoPersonID: null,
    },
  })
  const LeadIntroductionData = useQuery({
    queryKey: [queryKey, LeadIntroductionID],
    queryFn: () => fetchLeadIntroductionById(LeadIntroductionID, user.userID),
    enabled: LeadIntroductionID !== undefined,
    initialData: [],
  })

  useEffect(() => {
    if (
      LeadIntroductionID !== undefined &&
      LeadIntroductionData?.data?.length > 0
    ) {
      method.setValue("CompanyName", LeadIntroductionData.data[0].CompanyName)
      method.setValue("CountryID", LeadIntroductionData.data[0].CountryID)
      countryRef.current?.setCountryID(LeadIntroductionData.data[0].CountryID)
      method.setValue("TehsilID", LeadIntroductionData.data[0].TehsilID)
      method.setValue(
        "BusinessTypeID",
        LeadIntroductionData.data[0].BusinessTypeID
      )
      method.setValue(
        "BusinessNatureID",
        LeadIntroductionData.data[0].BusinessNature
      )
      method.setValue(
        "CompanyAddress",
        LeadIntroductionData.data[0].CompanyAddress
      )
      method.setValue(
        "CompanyWebsite",
        LeadIntroductionData.data[0].CompanyWebsite
      )
      method.setValue(
        "ContactPersonName",
        LeadIntroductionData.data[0].ContactPersonName
      )
      method.setValue(
        "ContactPersonMobileNo",
        LeadIntroductionData.data[0].ContactPersonMobileNo
      )
      method.setValue(
        "ContactPersonWhatsAppNo",
        LeadIntroductionData.data[0].ContactPersonWhatsAppNo
      )
      method.setValue(
        "ContactPersonEmail",
        LeadIntroductionData.data[0].ContactPersonEmail
      )
      method.setValue(
        "RequirementDetails",
        LeadIntroductionData.data[0].RequirementDetails
      )
      method.setValue("LeadSourceID", LeadIntroductionData.data[0].LeadSourceID)
      method.setValue("DemoPersonID", LeadIntroductionData.data[0].DemoPersonID)
      method.setValue(
        "DemoDate",
        new Date(LeadIntroductionData.data[0].DemoDate)
      )
    }
  }, [LeadIntroductionID, LeadIntroductionData.data])

  const mutation = useMutation({
    mutationFn: addNewLeadIntroduction,
    onSuccess: ({ success, RecordID }) => {
      if (success) {
        if (mode === "new") {
          displayYesNoDialog({
            message: "Do you want to quote the lead?",
            header: "Confirmation",
            accept: () => {
              setVisible(true)
              setLeadIntroductionID(RecordID)
              setOnQuotationAdded(() => () => {
                setVisible(false)
                queryClient.invalidateQueries({ queryKey: [queryKey] })
                navigate(`${parentRoute}/${RecordID}`)
              })
            },
            reject: () => {
              navigate(`${parentRoute}/${RecordID}`)
            },
            icon: <i className="pi pi-question text-5xl"></i>,
            severity: SEVERITIES.PRIMARY,
            defaultFocus: "accept",
          })
        } else {
          queryClient.invalidateQueries({ queryKey: [queryKey] })
          navigate(`${parentRoute}/${RecordID}`)
        }
      }
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteLeadIntroductionByID,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [queryKey] })
      navigate(parentRoute)
    },
  })
  function handleDelete() {
    deleteMutation.mutate({
      LeadIntroductionID: LeadIntroductionID,
      LoginUserID: user.userID,
    })
  }
  function handleAddNew() {
    method.reset()
    navigate(newRoute)
  }
  function handleCancel() {
    if (mode === "new") {
      navigate(parentRoute)
    } else if (mode === "edit") {
      method.clearErrors()
      navigate(viewRoute + LeadIntroductionID)
    }
  }
  function handleEdit() {
    navigate(editRoute + LeadIntroductionID)
  }

  function onSubmit(data) {
    data.ContactPersonWhatsAppNo = data.ContactPersonWhatsAppNo?.replaceAll(
      "-",
      ""
    )
    data.ContactPersonMobileNo = data.ContactPersonMobileNo?.replaceAll("-", "")

    mutation.mutate({
      formData: data,
      userID: user.userID,
      LeadIntroductionID: LeadIntroductionID,
    })
  }

  return (
    <>
      {LeadIntroductionData.isLoading ? (
        <>
          <CustomSpinner />
        </>
      ) : (
        <>
          {render}
          <div className="mt-4">
            <ButtonToolBar
              saveLoading={mutation.isPending}
              handleGoBack={() => navigate(parentRoute)}
              handleEdit={() => handleEdit()}
              handleCancel={() => {
                handleCancel()
              }}
              handleAddNew={() => {
                handleAddNew()
              }}
              handleDelete={handleDelete}
              handleSave={() => method.handleSubmit(onSubmit)()}
              GoBackLabel="LeadIntroductions"
              showAddNewButton={userRights[0]?.RoleNew}
              showEditButton={userRights[0]?.RoleEdit}
              showDelete={userRights[0]?.RoleDelete}
              mode={mode}
              PreviousAndNextIDs={PreviousAndNextIDs}
              handlePrevious={() =>
                navigate(
                  `${parentRoute}/${PreviousAndNextIDs.PreviousRecordID}`
                )
              }
              handleNext={() =>
                navigate(`${parentRoute}/${PreviousAndNextIDs.NextRecordID}`)
              }
              currentRecordId={LeadIntroductionID}
              handleFirstRecord={() => {
                navigate(`${parentRoute}/${PreviousAndNextIDs.FirstRecordID}`)
              }}
              handleLastRecord={() => {
                navigate(`${parentRoute}/${PreviousAndNextIDs.LastRecordID}`)
              }}
            />
          </div>
          <div className="mt-4">
            <FormProvider {...method}>
              <LeadsIntroductionFormComponent
                mode={mode}
                countryRef={countryRef}
              />
            </FormProvider>
            {mode === "view" && pageTitles?.ShowTimelineInsideLeadsForm && (
              <>
                <LeadsViewerDetailOnLeadsForm
                  LeadIntroductionID={LeadIntroductionID}
                  LoginUserID={user.userID}
                />
              </>
            )}
          </div>
        </>
      )}
    </>
  )
}

const useForwardDialog = (LeadIntroductionID) => {
  const [visible, setVisible] = useState(false)
  return {
    setVisible,
    render: (
      <ForwardDialog
        visible={visible}
        setVisible={setVisible}
        LeadIntroductionID={LeadIntroductionID}
      />
    ),
  }
}

function ForwardDialogComponent({ LeadIntroductionID }) {
  const { setVisible, render } = useForwardDialog(LeadIntroductionID)

  return (
    <>
      <Button
        icon="pi pi-send"
        rounded
        outlined
        className="text-blue-300 p-0"
        tooltip="Forward"
        tooltipOptions={{
          position: "left",
        }}
        onClick={() => setVisible(true)}
        style={{
          padding: "0px",
          fontSize: "small",
          width: "20px",
          height: "2rem",
          border: "none",
        }}
      />
      {render}
    </>
  )
}

function ForwardDialog({ visible = true, setVisible, LeadIntroductionID }) {
  const queryClient = useQueryClient()
  const user = useUserData()
  const usersSelectData = useAllUsersSelectData()
  const departmentSelectData = useAllDepartmentsSelectData()
  const productsSelectData = useProductsInfoSelectData(0, true)
  const method = useForm({
    defaultValues: {
      Description: "",
    },
  })

  const mutation = useMutation({
    mutationFn: addLeadIntroductionOnAction,
    onSuccess: ({ success }) => {
      if (success) {
        toast.success("Lead forwarded successfully!")
        queryClient.invalidateQueries({ queryKey: [queryKey] })
        queryClient.invalidateQueries({
          queryKey: [QUERY_KEYS.LEADS_CARD_DATA],
        })
      }
    },
  })

  const footerContent = (
    <>
      <Button
        label="Save"
        severity="success"
        className="rounded"
        type="button"
        onClick={() => method.handleSubmit(onSubmit)()}
      />
    </>
  )
  const dialogConent = (
    <>
      <FormRow>
        <FormColumn lg={6} xl={6} md={6}>
          <FormLabel>
            Department
            <span className="text-red-700 fw-bold ">*</span>
          </FormLabel>
          <div>
            <CDropdown
              control={method.control}
              name={`DepartmentID`}
              optionLabel="DepartmentName"
              optionValue="DepartmentID"
              placeholder="Select a department"
              options={departmentSelectData.data}
              focusOptions={() => method.setFocus("InActive")}
              showClear={true}
            />
          </div>
        </FormColumn>
        <FormColumn lg={6} xl={6} md={6}>
          <FormLabel>
            User
            <span className="text-red-700 fw-bold ">*</span>
          </FormLabel>
          <div>
            <CDropdown
              control={method.control}
              name={`UserID`}
              optionLabel="UserName"
              optionValue="UserID"
              placeholder="Select a user"
              options={usersSelectData.data}
              focusOptions={() => method.setFocus("InActive")}
              showClear={true}
            />
          </div>
        </FormColumn>
      </FormRow>
      <FormRow>
        <FormColumn lg={4} xl={4} md={6}>
          <FormLabel style={{ fontSize: "14px", fontWeight: "bold" }}>
            Meeting Medium
            <span className="text-red-700 fw-bold ">*</span>
          </FormLabel>
          <div>
            <CDropdown
              control={method.control}
              name={`MeetingPlace`}
              placeholder="Select a place"
              options={[
                { label: "At Client Site", value: "AtClientSite" },
                { label: "At Office", value: "AtOffice" },
                { label: "Online", value: "Online" },
              ]}
              required={true}
              focusOptions={() => method.setFocus("MeetingTime")}
            />
          </div>
        </FormColumn>
        <FormColumn lg={4} xl={4} md={6}>
          <FormLabel style={{ fontSize: "14px", fontWeight: "bold" }}>
            Meeting Date & Time
            <span className="text-red-700 fw-bold ">*</span>
          </FormLabel>
          <div>
            <Controller
              name="MeetingTime"
              control={method.control}
              rules={{ required: "Date is required." }}
              render={({ field, fieldState }) => (
                <>
                  <Calendar
                    inputId={field.name}
                    value={field.value}
                    onChange={field.onChange}
                    dateFormat="dd-M-yy"
                    style={{ width: "100%" }}
                    className={classNames({ "p-invalid": fieldState.error })}
                    showTime
                    showIcon
                    hourFormat="12"
                  />
                </>
              )}
            />
          </div>
        </FormColumn>
        <FormColumn lg={4} xl={4} md={6}>
          <FormLabel style={{ fontSize: "14px", fontWeight: "bold" }}>
            Recomended Product
            <span className="text-red-700 fw-bold ">*</span>
          </FormLabel>
          <div>
            <CDropdown
              control={method.control}
              name={`ProductInfoID`}
              optionLabel="ProductInfoTitle"
              optionValue="ProductInfoID"
              placeholder="Select a product"
              options={productsSelectData.data}
              required={true}
              focusOptions={() => method.setFocus("Description")}
            />
          </div>
        </FormColumn>
      </FormRow>
      <FormRow>
        <FormColumn lg={12} xl={12} md={12}>
          <FormLabel>Instructions</FormLabel>
          <TextAreaField
            control={method.control}
            name={"Description"}
            autoResize={true}
          />
        </FormColumn>
      </FormRow>
    </>
  )

  function onSubmit(data) {
    if (data.DepartmentID === undefined && data.UserID === undefined) {
      method.setError("DepartmentID", { type: "required" })
      method.setError("UserID", { type: "required" })
    } else {
      mutation.mutate({
        from: "Forward",
        formData: data,
        userID: user.userID,
        LeadIntroductionID: LeadIntroductionID,
      })
    }
  }

  return (
    <>
      <Dialog
        footer={footerContent}
        header="Forward To"
        visible={visible}
        onHide={() => setVisible(false)}
        style={{ width: "75vw", height: "55vh" }}
      >
        {dialogConent}
      </Dialog>
    </>
  )
}
// Quoted
const useQuoteDialog = (leadsIntroductionID) => {
  const [LeadIntroductionID, setLeadIntroductionID] = useState()
  const [onQuotationAdded, setOnQuotationAdded] = useState(() => null)

  useEffect(() => {
    if (leadsIntroductionID) {
      setLeadIntroductionID(leadsIntroductionID)
    }
  }, [leadsIntroductionID])

  const [visible, setVisible] = useState(false)
  return {
    setVisible,
    setLeadIntroductionID,
    setOnQuotationAdded,
    render: (
      <QuoteDialog
        visible={visible}
        setVisible={setVisible}
        LeadIntroductionID={LeadIntroductionID}
        onQuotationAdded={onQuotationAdded}
      />
    ),
  }
}

function QuoteDialogComponent({ LeadIntroductionID }) {
  const { setVisible, render } = useQuoteDialog(LeadIntroductionID)

  return (
    <>
      <Button
        icon="pi pi-dollar"
        rounded
        severity="success"
        outlined
        className="p-0"
        tooltip="Quoted"
        tooltipOptions={{
          position: "left",
        }}
        onClick={() => setVisible(true)}
        style={{
          padding: "0px",
          fontSize: "small",
          width: "20px",
          height: "2rem",
          border: "none",
        }}
      />
      {render}
    </>
  )
}

function QuoteDialog({
  visible = true,
  setVisible,
  LeadIntroductionID,
  onQuotationAdded,
}) {
  const method = useForm({
    defaultValues: {
      Description: "",
      Amount: "",
    },
  })
  const fileRef = useRef()
  const queryClient = useQueryClient()
  const user = useUserData()
  const footerContent = (
    <>
      <Button
        label="Save"
        severity="success"
        className="rounded"
        type="button"
        onClick={() => method.handleSubmit(onSubmit)()}
      />
    </>
  )
  const headerContent = <></>
  const dialogConent = (
    <>
      <FormRow>
        <FormColumn lg={12} xl={12} md={6}>
          <FormLabel>
            File
            <span className="text-red-700 fw-bold ">*</span>
          </FormLabel>
          <div>
            <SingleFileUploadField ref={fileRef} background="bg-primary" />
          </div>
        </FormColumn>
      </FormRow>
      <FormRow>
        <FormColumn lg={3} xl={3} md={6}>
          <FormLabel>Amount</FormLabel>
          <div>
            <NumberInput
              control={method.control}
              id={"Amount"}
              required
              enterKeyOptions={() => method.setFocus("Description")}
            />
          </div>
        </FormColumn>
        <FormColumn lg={9} xl={9} md={6}>
          <FormLabel>Description</FormLabel>
          <TextAreaField
            control={method.control}
            name={"Description"}
            autoResize={true}
            required
          />
        </FormColumn>
      </FormRow>
    </>
  )
  const mutation = useMutation({
    mutationFn: addLeadIntroductionOnAction,
    onSuccess: ({ success }) => {
      if (success) {
        toast.success("Lead quoted successfully!")
        queryClient.invalidateQueries({ queryKey: [queryKey] })
        queryClient.invalidateQueries({
          queryKey: [QUERY_KEYS.LEADS_CARD_DATA],
        })
        if (onQuotationAdded) {
          onQuotationAdded()
        }
      }
    },
  })
  function onSubmit(data) {
    const file = fileRef.current?.getFile()

    data.AttachmentFile = file
    mutation.mutate({
      from: "Quoted",
      formData: data,
      userID: user.userID,
      LeadIntroductionID: LeadIntroductionID,
    })
  }

  return (
    <>
      <Dialog
        footer={footerContent}
        header="Quoted"
        visible={visible}
        draggable={false}
        onHide={() => setVisible(false)}
        style={{ width: "75vw", height: "80vh" }}
      >
        {dialogConent}
      </Dialog>
    </>
  )
}
// Finalized
const useFinalizedDialog = (LeadIntroductionID) => {
  const [visible, setVisible] = useState(false)
  return {
    setVisible,
    render: (
      <FinalizedDialog
        visible={visible}
        setVisible={setVisible}
        LeadIntroductionID={LeadIntroductionID}
      />
    ),
  }
}

function FinalizedDialogComponent({ LeadIntroductionID }) {
  const { setVisible, render } = useFinalizedDialog(LeadIntroductionID)

  return (
    <>
      <Button
        icon="pi pi-check"
        rounded
        outlined
        severity="help"
        tooltip="Finalized"
        tooltipOptions={{
          position: "left",
        }}
        onClick={() => setVisible(true)}
        style={{
          padding: "0px",
          fontSize: "small",
          width: "20px",
          height: "2rem",
          border: "none",
        }}
      />
      {render}
    </>
  )
}

function FinalizedDialog({ visible = true, setVisible, LeadIntroductionID }) {
  const queryClient = useQueryClient()
  const user = useUserData()
  const method = useForm({
    defaultValues: {
      Description: "",
      Amount: "",
    },
  })

  const fileRef = useRef(null)

  const mutation = useMutation({
    mutationFn: addLeadIntroductionOnAction,
    onSuccess: ({ success }) => {
      if (success) {
        toast.success("Lead finalized successfully!")
        queryClient.invalidateQueries({ queryKey: [queryKey] })
        queryClient.invalidateQueries({
          queryKey: [QUERY_KEYS.LEADS_CARD_DATA],
        })
      }
    },
  })

  const footerContent = (
    <>
      <Button
        label="Save"
        severity="success"
        className="rounded"
        type="button"
        onClick={() => method.handleSubmit(onSubmit)()}
      />
    </>
  )
  const dialogConent = (
    <>
      <FormRow>
        <FormColumn lg={12} xl={12} md={6}>
          <FormLabel>
            File
            <span className="text-red-700 fw-bold ">*</span>
          </FormLabel>
          <div>
            <SingleFileUploadField ref={fileRef} background="bg-primary" />
          </div>
        </FormColumn>
      </FormRow>
      <FormRow>
        <FormColumn lg={3} xl={3} md={6}>
          <FormLabel>Amount</FormLabel>
          <div>
            <NumberInput
              control={method.control}
              id={`Amount`}
              enterKeyOptions={() => method.setFocus("Description")}
              required
            />
          </div>
        </FormColumn>
        <FormColumn lg={9} xl={9} md={6}>
          <FormLabel>Description</FormLabel>
          <TextAreaField
            control={method.control}
            name={"Description"}
            autoResize={true}
            required
          />
        </FormColumn>
      </FormRow>
    </>
  )

  function onSubmit(data) {
    const file = fileRef.current?.getFile()

    data.AttachmentFile = file
    mutation.mutate({
      from: "Finalized",
      formData: data,
      userID: user.userID,
      LeadIntroductionID: LeadIntroductionID,
    })
  }

  return (
    <>
      <Dialog
        footer={footerContent}
        header="Finalized"
        visible={visible}
        draggable={false}
        onHide={() => setVisible(false)}
        style={{ width: "75vw", height: "80vh" }}
      >
        {dialogConent}
      </Dialog>
    </>
  )
}

// Closed
const useClosedDialog = (LeadIntroductionID) => {
  const [visible, setVisible] = useState(false)
  return {
    setVisible,
    render: (
      <ClosedDialog
        visible={visible}
        setVisible={setVisible}
        LeadIntroductionID={LeadIntroductionID}
      />
    ),
  }
}

function ClosedDialogComponent({ LeadIntroductionID }) {
  const { setVisible, render } = useClosedDialog(LeadIntroductionID)
  return (
    <>
      <Button
        icon="pi pi-times"
        rounded
        outlined
        severity="danger"
        tooltip="Closed"
        tooltipOptions={{
          position: "left",
        }}
        onClick={() => setVisible(true)}
        style={{
          padding: "0px",
          fontSize: "small",
          width: "20px",
          height: "2rem",
          border: "none",
        }}
      />

      {render}
    </>
  )
}

function ClosedDialog({ visible = true, setVisible, LeadIntroductionID }) {
  const method = useForm({
    defaultValues: {
      Description: "",
      Amount: 0,
    },
  })
  const queryClient = useQueryClient()
  const user = useUserData()
  const footerContent = (
    <>
      <Button
        label="Save"
        severity="success"
        className="rounded"
        type="button"
        onClick={() => method.handleSubmit(onSubmit)()}
      />
    </>
  )
  const mutation = useMutation({
    mutationFn: addLeadIntroductionOnAction,
    onSuccess: ({ success }) => {
      if (success) {
        toast.success("Lead closed successfully!")
        queryClient.invalidateQueries({ queryKey: [queryKey] })
        queryClient.invalidateQueries({
          queryKey: [QUERY_KEYS.LEADS_CARD_DATA],
        })
      }
    },
  })
  function onSubmit(data) {
    mutation.mutate({
      from: "Closed",
      formData: data,
      userID: user.userID,
      LeadIntroductionID: LeadIntroductionID,
    })
  }
  const dialogConent = (
    <>
      <FormRow>
        <FormColumn lg={9} xl={9} md={6}>
          <FormLabel>Reason</FormLabel>
          <TextAreaField
            control={method.control}
            name={"Description"}
            autoResize={true}
            required={true}
          />
        </FormColumn>
        <FormColumn lg={3} xl={3} md={6}>
          <FormLabel>Expected Amount</FormLabel>
          <div>
            <NumberInput
              control={method.control}
              id={`Amount`}
              enterKeyOptions={() => method.setFocus("Description")}
            />
          </div>
        </FormColumn>
      </FormRow>
    </>
  )

  return (
    <>
      <Dialog
        footer={footerContent}
        header="Closed"
        visible={visible}
        draggable={false}
        onHide={() => setVisible(false)}
        style={{ width: "75vw", height: "40vh" }}
      >
        {dialogConent}
      </Dialog>
    </>
  )
}
