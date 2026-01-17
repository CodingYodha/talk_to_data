import {Fragment,useCallback,useContext,useEffect,useMemo,useRef} from "react"
import {Box as RadixThemesBox,Button as RadixThemesButton,Callout as RadixThemesCallout,Container as RadixThemesContainer,Flex as RadixThemesFlex,Heading as RadixThemesHeading,Spinner as RadixThemesSpinner,Table as RadixThemesTable,Text as RadixThemesText,TextField as RadixThemesTextField} from "@radix-ui/themes"
import {ColorModeContext,EventLoopContext,StateContexts} from "$/utils/context"
import {ReflexEvent,generateUUID,getRefValue,getRefValues,isTrue,refs} from "$/utils/state"
import {Content as RadixAccordionContent,Header as RadixAccordionHeader,Item as RadixAccordionItem,Root as RadixAccordionRoot,Trigger as RadixAccordionTrigger} from "@radix-ui/react-accordion"
import {ChevronDown as LucideChevronDown} from "lucide-react"
import {jsx,keyframes} from "@emotion/react"
import {PrismAsyncLight as SyntaxHighlighter} from "react-syntax-highlighter"
import oneLight from "react-syntax-highlighter/dist/esm/styles/prism/one-light"
import oneDark from "react-syntax-highlighter/dist/esm/styles/prism/one-dark"
import {Root as RadixFormRoot} from "@radix-ui/react-form"




function Fragment_85353d915609470802d269e083036188 () {
  const reflex___state____state__sql_agent___state____state = useContext(StateContexts.reflex___state____state__sql_agent___state____state)



  return (
    jsx(Fragment,{},(reflex___state____state__sql_agent___state____state.is_thinking_rx_state_?(jsx(Fragment,{},jsx(RadixThemesFlex,{css:({ ["display"] : "flex", ["alignItems"] : "center", ["justifyContent"] : "center", ["width"] : "100%", ["py"] : 4 })},jsx(RadixThemesSpinner,{},)))):(jsx(Fragment,{},))))
  )
}


function Flex_7eb6a49d9c4331b49375e717358bf463 () {
  const reflex___state____state__sql_agent___state____state = useContext(StateContexts.reflex___state____state__sql_agent___state____state)
const udaxihhe = useMemo(generateUUID, [])
const { resolvedColorMode } = useContext(ColorModeContext)



  return (
    jsx(RadixThemesFlex,{align:"start",className:"rx-Stack",css:({ ["width"] : "100%", ["height"] : "70vh", ["overflowY"] : "auto", ["p"] : 4, ["border"] : "1px solid #e2e8f0", ["borderRadius"] : "md", ["background"] : "white" }),direction:"column",gap:"3"},Array.prototype.map.call(reflex___state____state__sql_agent___state____state.chat_history_rx_state_ ?? [],((message_rx_state_,index_e1f7a158eebe110f443e19771fabd21b)=>(jsx(RadixThemesBox,{css:({ ["width"] : "100%", ["display"] : "flex", ["flexDirection"] : "column", ["mb"] : 4 }),key:index_e1f7a158eebe110f443e19771fabd21b},jsx(Fragment,{},((message_rx_state_?.["role"]?.valueOf?.() === "user"?.valueOf?.())?(jsx(Fragment,{},jsx(RadixThemesBox,{css:({ ["background"] : "blue.500", ["p"] : 3, ["borderRadius"] : "lg", ["alignSelf"] : "flex-end", ["maxW"] : "80%" })},jsx(RadixThemesText,{as:"p",css:({ ["color"] : "white" })},message_rx_state_?.["content"])))):(jsx(Fragment,{},jsx(RadixThemesBox,{css:({ ["background"] : "gray.100", ["p"] : 4, ["borderRadius"] : "lg", ["alignSelf"] : "flex-start", ["maxW"] : "90%", ["width"] : "100%" })},jsx(RadixThemesFlex,{align:"start",className:"rx-Stack",css:({ ["alignItems"] : "start", ["width"] : "100%" }),direction:"column",gap:"3"},jsx(RadixThemesText,{as:"p",css:({ ["fontWeight"] : "bold" })},message_rx_state_?.["content"]),jsx(RadixAccordionRoot,{collapsible:true,css:({ ["borderRadius"] : "var(--radius-4)", ["boxShadow"] : "0 2px 10px var(--black-a1)", ["&[data-variant='classic']"] : ({ ["backgroundColor"] : "var(--accent-9)", ["boxShadow"] : "0 2px 10px var(--black-a4)" }), ["&[data-variant='soft']"] : ({ ["backgroundColor"] : "var(--accent-3)" }), ["&[data-variant='outline']"] : ({ ["border"] : "1px solid var(--accent-6)", ["--divider-px"] : "1px" }), ["&[data-variant='surface']"] : ({ ["border"] : "1px solid var(--accent-6)", ["backgroundColor"] : "var(--accent-surface)", ["--divider-px"] : "1px" }), ["&[data-variant='ghost']"] : ({ ["backgroundColor"] : "none", ["boxShadow"] : "None" }), ["--animation-duration"] : (250+"ms"), ["--animation-easing"] : "cubic-bezier(0.87, 0, 0.13, 1)", ["width"] : "100%" }),"data-variant":"classic"},jsx(RadixAccordionItem,{className:"AccordionItem",css:({ ["overflow"] : "hidden", ["width"] : "100%", ["marginTop"] : "1px", ["borderTop"] : "var(--divider-px) solid var(--gray-a6)", ["&:first-child"] : ({ ["marginTop"] : 0, ["borderTop"] : 0, ["borderTopLeftRadius"] : "var(--radius-4)", ["borderTopRightRadius"] : "var(--radius-4)" }), ["&:last-child"] : ({ ["borderBottomLeftRadius"] : "var(--radius-4)", ["borderBottomRightRadius"] : "var(--radius-4)" }), ["&:focus-within"] : ({ ["position"] : "relative", ["zIndex"] : 1 }), ["&:first-child[data-variant='ghost'], *:where([data-variant='ghost']) &:first-child"] : ({ ["borderRadius"] : 0, ["borderTop"] : "var(--divider-px) solid var(--gray-a6)" }), ["&:last-child[data-variant='ghost'], *:where([data-variant='ghost']) &:last-child"] : ({ ["borderRadius"] : 0, ["borderBottom"] : "var(--divider-px) solid var(--gray-a6)" }) }),value:udaxihhe},jsx(RadixAccordionHeader,{className:"AccordionHeader",css:({ ["display"] : "flex", ["margin"] : "0" })},jsx(RadixAccordionTrigger,{className:"AccordionTrigger",css:({ ["color"] : "var(--accent-11)", ["fontSize"] : "1.1em", ["lineHeight"] : 1, ["justifyContent"] : "space-between", ["alignItems"] : "center", ["flex"] : 1, ["display"] : "flex", ["padding"] : "var(--space-3) var(--space-4)", ["width"] : "100%", ["boxShadow"] : "0 var(--divider-px) 0 var(--gray-a6)", ["&[data-state='open'] > .AccordionChevron"] : ({ ["transform"] : "rotate(180deg)" }), ["&:hover"] : ({ ["backgroundColor"] : "var(--accent-4)" }), ["& > .AccordionChevron"] : ({ ["transition"] : "transform var(--animation-duration) var(--animation-easing)" }), ["&[data-variant='classic'], *:where([data-variant='classic']) &"] : ({ ["color"] : "var(--accent-contrast)", ["&:hover"] : ({ ["backgroundColor"] : "var(--accent-10)" }), ["& > .AccordionChevron"] : ({ ["color"] : "var(--accent-contrast)" }) }), ["background"] : "none", ["border"] : "none" })},"\ud83e\udde0 Reasoning Trace & SQL",jsx(LucideChevronDown,{className:"AccordionChevron"},))),jsx(RadixAccordionContent,{className:"AccordionContent",css:({ ["overflow"] : "hidden", ["color"] : "var(--accent-11)", ["paddingInlineStart"] : "var(--space-4)", ["paddingInlineEnd"] : "var(--space-4)", ["&:before, &:after"] : ({ ["content"] : "' '", ["display"] : "block", ["height"] : "var(--space-3)" }), ["&[data-state='open']"] : ({ ["animation"] : (keyframes({ from: { height: 0 }, to: { height: "var(--radix-accordion-content-height)" } })+" var(--animation-duration) var(--animation-easing)") }), ["&[data-state='closed']"] : ({ ["animation"] : (keyframes({ from: { height: "var(--radix-accordion-content-height)" }, to: { height: 0 } })+" var(--animation-duration) var(--animation-easing)") }), ["&[data-variant='classic'], *:where([data-variant='classic']) &"] : ({ ["color"] : "var(--accent-contrast)" }) })},jsx(RadixThemesFlex,{align:"start",className:"rx-Stack",css:({ ["alignItems"] : "start" }),direction:"column",gap:"3"},jsx(RadixThemesText,{as:"p",css:({ ["fontWeight"] : "bold", ["fontSize"] : "sm" })},"Thought Process:"),jsx(RadixThemesText,{as:"p",css:({ ["fontSize"] : "sm", ["whiteSpace"] : "pre-wrap" })},message_rx_state_?.["thought_trace"]),jsx(RadixThemesText,{as:"p",css:({ ["fontWeight"] : "bold", ["fontSize"] : "sm", ["mt"] : 2 })},"Generated SQL:"),jsx(SyntaxHighlighter,{children:message_rx_state_?.["sql_code"],css:({ ["width"] : "100%" }),language:"sql",style:((resolvedColorMode?.valueOf?.() === "light"?.valueOf?.()) ? oneLight : oneDark)},))))),jsx(Fragment,{},(isTrue(message_rx_state_?.["results"])?(jsx(Fragment,{},jsx(RadixThemesBox,{css:({ ["width"] : "100%", ["minWidth"] : "800px", ["overflowX"] : "auto", ["overflowY"] : "auto", ["maxH"] : "500px", ["mt"] : 2, ["background"] : "white", ["borderRadius"] : "md", ["border"] : "1px solid #dee2e6" })},jsx(RadixThemesTable.Root,{css:({ ["borderCollapse"] : "collapse", ["width"] : "100%" })},jsx(RadixThemesTable.Header,{},jsx(RadixThemesTable.Row,{},Array.prototype.map.call(message_rx_state_?.["columns"] ?? [],((col_rx_state_,index_afdb3660a66424f58acbffbfda4130c4)=>(jsx(RadixThemesTable.ColumnHeaderCell,{css:({ ["fontWeight"] : "bold", ["padding"] : "12px 16px", ["backgroundColor"] : "#f8f9fa", ["borderBottom"] : "2px solid #dee2e6", ["whiteSpace"] : "nowrap", ["color"] : "black" }),key:index_afdb3660a66424f58acbffbfda4130c4},col_rx_state_)))))),jsx(RadixThemesTable.Body,{},Array.prototype.map.call(message_rx_state_?.["results"] ?? [],((row_rx_state_,index_9f425e9c434bd746559a46c37d08ddb2)=>(jsx(RadixThemesTable.Row,{key:index_9f425e9c434bd746559a46c37d08ddb2},Array.prototype.map.call(message_rx_state_?.["columns"] ?? [],((col_rx_state_,index_5750e6c53755653bc161662c06b3541d)=>(jsx(RadixThemesTable.Cell,{css:({ ["padding"] : "10px 16px", ["borderBottom"] : "1px solid #dee2e6", ["color"] : "black", ["whiteSpace"] : "pre-wrap", ["wordWrap"] : "break-word" }),key:index_5750e6c53755653bc161662c06b3541d},jsx(RadixThemesText,{as:"p"},row_rx_state_?.[col_rx_state_])))))))))))))):(jsx(Fragment,{},((message_rx_state_?.["role"]?.valueOf?.() === "assistant"?.valueOf?.())?(jsx(Fragment,{},jsx(RadixThemesText,{as:"p",css:({ ["fontStyle"] : "italic", ["color"] : "gray.500", ["mt"] : 2 })},"No results found."))):(jsx(Fragment,{},))))))),jsx(Fragment,{},(!((message_rx_state_?.["error"]?.valueOf?.() === ""?.valueOf?.()))?(jsx(Fragment,{},jsx(RadixThemesCallout.Root,{color:"red",css:({ ["width"] : "100%", ["mt"] : 2 }),role:"alert"},jsx(RadixThemesCallout.Icon,{},),jsx(RadixThemesCallout.Text,{},message_rx_state_?.["error"])))):(jsx(Fragment,{},)))))))))))))),jsx(Fragment_85353d915609470802d269e083036188,{},))
  )
}


function Root_ec8f2d117b596732105d98664ed3c3ac () {
  const [addEvents, connectErrors] = useContext(EventLoopContext);
const ref_question = useRef(null); refs["ref_question"] = ref_question;

    const handleSubmit_3458494eb35eaa7aa445678ebd37e1de = useCallback((ev) => {
        const $form = ev.target
        ev.preventDefault()
        const form_data = {...Object.fromEntries(new FormData($form).entries()), ...({ ["question"] : getRefValue(refs["ref_question"]) })};

        (((...args) => (addEvents([(ReflexEvent("reflex___state____state.sql_agent___state____state.handle_submit", ({ ["form_data"] : form_data }), ({  })))], args, ({  }))))(ev));

        if (false) {
            $form.reset()
        }
    })
    


  return (
    jsx(RadixFormRoot,{className:"Root ",css:({ ["width"] : "100%", ["mt"] : 4 }),onSubmit:handleSubmit_3458494eb35eaa7aa445678ebd37e1de},jsx(RadixThemesFlex,{align:"start",className:"rx-Stack",css:({ ["width"] : "100%" }),direction:"row",gap:"3"},jsx(RadixThemesTextField.Root,{css:({ ["width"] : "100%" }),id:"question",placeholder:"Ask a question (e.g., 'Who are the top 5 artists by sales?')",ref:ref_question},),jsx(RadixThemesButton,{type:"submit"},"Send")))
  )
}


export default function Component() {





  return (
    jsx(Fragment,{},jsx(RadixThemesContainer,{css:({ ["padding"] : "16px", ["py"] : 8 }),size:"3"},jsx(RadixThemesFlex,{align:"start",className:"rx-Stack",css:({ ["width"] : "100%", ["alignItems"] : "center" }),direction:"column",gap:"3"},jsx(RadixThemesHeading,{css:({ ["mb"] : 4 }),size:"8"},"\ud83d\udde3\ufe0f Talk to Data"),jsx(RadixThemesText,{as:"p",css:({ ["color"] : "gray" })},"Query the Chinook Music Database using natural language."),jsx(Flex_7eb6a49d9c4331b49375e717358bf463,{},),jsx(Root_ec8f2d117b596732105d98664ed3c3ac,{},))),jsx("title",{},"Talk to Data SQL Agent"),jsx("meta",{content:"favicon.ico",property:"og:image"},))
  )
}