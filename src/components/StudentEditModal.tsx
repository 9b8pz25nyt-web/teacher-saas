"use client";

import { X } from "lucide-react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { countries } from "@/constants/countries";
import { currencies } from "@/constants/currencies";

export default function StudentEditModal({
  onClose,
  onSave,

  teacherAliases,

  name,
  setName,

  teacherAlias,
  setTeacherAlias,

  meetingLink,
  setMeetingLink,

  email,
  setEmail,

  phone,
  setPhone,

  age,
  setAge,

  country,
  setCountry,

  paymentCurrency,
  setPaymentCurrency,

  paymentAmount,
  setPaymentAmount,

  phpEquivalent,

  classesIncluded,
  setClassesIncluded,

  freeClasses,
  setFreeClasses,

  classesCompleted,
  setClassesCompleted,

  contractStartDate,
  setContractStartDate,

  contractEndDate,
  setContractEndDate,

  classDuration,
  setClassDuration,

  customDuration,
  setCustomDuration,

  paymentStatus,
  setPaymentStatus,

  notes,
  setNotes,

  calculatePHP,
  calculateEndDate,

}: any) {


return (
<div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto">

  <div className="card bg-white w-full max-w-xl max-h-[90vh] overflow-y-auto p-6 rounded-3xl shadow-xl space-y-4">


    <div className="flex items-center justify-between">

      <h2 className="text-2xl font-bold text-pink-600">
        Edit Student
      </h2>

      <button
        onClick={onClose}
        className="p-2 rounded-full hover:bg-pink-50"
      >
        <X size={18}/>
      </button>

    </div>


    <div className="space-y-4">


      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">


        <div>
          <label className="block mb-1 text-xs font-semibold text-gray-700">
            Student Name *
          </label>

          <input
            className="input w-full text-xs"
            value={name}
            onChange={(e)=>setName(e.target.value)}
          />

        </div>


        <div>
          <label className="block mb-1 text-xs font-semibold text-gray-700">
            Assigned Teacher Alias *
          </label>

          <select
            className="input w-full text-xs bg-white"
            value={teacherAlias}
            onChange={(e)=>setTeacherAlias(e.target.value)}
          >

            {teacherAliases.map((alias:string)=>(
              <option key={alias} value={alias}>
                {alias}
              </option>
            ))}

          </select>

        </div>


      </div>



      <div>
        <label className="block mb-1 text-xs font-semibold text-gray-700">
          Classroom Video Link (Zoom / Meet URL)
        </label>

        <input
          className="input w-full text-xs font-mono"
          value={meetingLink}
          onChange={(e)=>setMeetingLink(e.target.value)}
        />

      </div>


      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">

        <div>
          <label className="block mb-1 text-xs font-semibold text-gray-700">
            Email
          </label>

          <input
            className="input w-full text-xs"
            value={email}
            onChange={(e)=>setEmail(e.target.value)}
          />

        </div>


        <div>
          <label className="block mb-1 text-xs font-semibold text-gray-700">
            Phone
          </label>

          <input
            className="input w-full text-xs"
            value={phone}
            onChange={(e)=>setPhone(e.target.value)}
          />

        </div>

      </div>



      <div className="grid grid-cols-2 gap-3">

        <div>
          <label className="block mb-1 text-xs font-semibold text-gray-700">
            Age
          </label>

          <input
            type="number"
            className="input w-full text-xs"
            value={age}
            onChange={(e)=>setAge(e.target.value)}
          />

        </div>


        <div>
          <label className="block mb-1 text-xs font-semibold text-gray-700">
            Country *
          </label>

          <select
            className="input w-full text-xs bg-white"
            value={country}
            onChange={(e)=>{
              const selected=e.target.value;
              setCountry(selected);

              const selectedCountry =
                countries.find((item)=>item.name===selected);

              if(selectedCountry){
                setPaymentCurrency(selectedCountry.currency);
              }
            }}
          >

            <option value="">
              Select Country
            </option>

            {countries.map((item)=>(
              <option key={item.name} value={item.name}>
                {item.name} {item.flag}
              </option>
            ))}

          </select>

        </div>

      </div>
            <div className="grid grid-cols-2 gap-3">

        <div>
          <label className="block mb-1 text-xs font-semibold text-gray-700">
            Currency
          </label>

          <select
            className="input w-full text-xs bg-white"
            value={paymentCurrency}
            onChange={(e)=>{
              const currency = e.target.value;
              setPaymentCurrency(currency);
              calculatePHP(paymentAmount, currency);
            }}
          >

            {Object.keys(currencies).map((code)=>(
              <option key={code} value={code}>
                {currencies[code].symbol} {code}
              </option>
            ))}

          </select>

        </div>


        <div>

          <label className="block mb-1 text-xs font-semibold text-gray-700">
            Payment Amount *
          </label>


          <input
            className="input w-full text-xs"
            value={paymentAmount}
            onChange={(e)=>{
              const raw=e.target.value.replace(/,/g,"");

              if(raw===""){
                setPaymentAmount("");
              }
              else if(!isNaN(Number(raw))){
                setPaymentAmount(
                  Number(raw).toLocaleString()
                );

                calculatePHP(
                  Number(raw).toLocaleString(),
                  paymentCurrency
                );
              }

            }}
          />

        </div>

      </div>



      {phpEquivalent && (

        <div className="p-2.5 bg-pink-50 rounded-xl text-xs font-semibold text-pink-700 flex justify-between">

          <span>
            Estimated PHP Gross:
          </span>

          <span>
            ₱{phpEquivalent}
          </span>

        </div>

      )}




      <div className="grid grid-cols-2 gap-3">


        <div>

          <label className="block mb-1 text-xs font-semibold text-gray-700">
            Classes Included
          </label>


          <input
            type="number"
            className="input w-full text-xs"
            value={classesIncluded}
            onChange={(e)=>{
              setClassesIncluded(e.target.value);

              calculateEndDate(
                contractStartDate,
                e.target.value,
                freeClasses
              );
            }}
          />

        </div>



        <div>

          <label className="block mb-1 text-xs font-semibold text-gray-700">
            Free Classes
          </label>


          <input
            type="number"
            className="input w-full text-xs"
            value={freeClasses}
            onChange={(e)=>{
              setFreeClasses(e.target.value);

              calculateEndDate(
                contractStartDate,
                classesIncluded,
                e.target.value
              );
            }}
          />

        </div>


      </div>




      <div>

        <label className="block mb-1 text-xs font-semibold text-gray-700">
          Classes Completed
        </label>


        <input
          type="number"
          className="input w-full text-xs"
          value={classesCompleted}
          onChange={(e)=>setClassesCompleted(e.target.value)}
        />


      </div>





      <div className="grid grid-cols-2 gap-3">


        <div>

          <label className="block mb-1 text-xs font-semibold text-gray-700">
            Contract Start Date
          </label>


          <DatePicker

            selected={
              contractStartDate
              ? new Date(contractStartDate)
              : null
            }

            onChange={(date:Date|null)=>{

              if(date){

                const formatted =
                  `${date.getFullYear()}-${String(
                    date.getMonth()+1
                  ).padStart(2,"0")}-${String(
                    date.getDate()
                  ).padStart(2,"0")}`;

                setContractStartDate(formatted);

                calculateEndDate(
                  formatted,
                  classesIncluded,
                  freeClasses
                );

              }

            }}

            dateFormat="yyyy-MM-dd"

            className="input w-full text-xs bg-white cursor-pointer"

            wrapperClassName="w-full"

          />

        </div>



        <div>

          <label className="block mb-1 text-xs font-semibold text-gray-700">
            Contract End Date
          </label>


          <input

            type="date"

            className="input w-full text-xs bg-gray-50"

            value={contractEndDate}

            onChange={(e)=>setContractEndDate(e.target.value)}

          />

        </div>


      </div>





      <div className="grid grid-cols-2 gap-3">


        <div>

          <label className="block mb-1 text-xs font-semibold text-gray-700">
            Class Duration
          </label>


          <select

            className="input w-full text-xs bg-white"

            value={
              classDuration === ""
              ? "custom"
              : classDuration
            }

            onChange={(e)=>{

              if(e.target.value==="custom"){

                setClassDuration("");

              }else{

                setClassDuration(e.target.value);
                setCustomDuration("");

              }

            }}

          >

            <option value="25">
              25 minutes
            </option>

            <option value="40">
              40 minutes
            </option>

            <option value="50">
              50 minutes
            </option>

            <option value="60">
              60 minutes
            </option>

            <option value="90">
              90 minutes
            </option>

            <option value="custom">
              + Custom
            </option>


          </select>

        </div>





        <div>

          <label className="block mb-1 text-xs font-semibold text-gray-700">
            Payment Status
          </label>


          <select

            className="input w-full text-xs bg-white"

            value={paymentStatus}

            onChange={(e)=>setPaymentStatus(e.target.value)}

          >

            <option value="Active">
              Active
            </option>

            <option value="Pending">
              Pending
            </option>

            <option value="Expired">
              Expired
            </option>

            <option value="Completed">
              Completed
            </option>


          </select>


        </div>


      </div>





      {classDuration === "" && (

        <input

          type="number"

          placeholder="Enter custom duration (minutes)"

          className="input w-full text-xs"

          value={customDuration}

          onChange={(e)=>setCustomDuration(e.target.value)}

        />

      )}






      <textarea

        placeholder="Notes..."

        rows={2}

        className="input w-full text-xs"

        value={notes}

        onChange={(e)=>setNotes(e.target.value)}

      />


    </div>





    <div className="flex justify-end gap-3 pt-4 border-t border-pink-100">


      <button

        onClick={onClose}

        className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-xs font-semibold text-gray-600 transition cursor-pointer"

      >

        Cancel

      </button>




      <button

        onClick={onSave}

        className="btn-primary cursor-pointer text-xs"

      >

        Save Changes

      </button>



    </div>



  </div>


</div>

);

}