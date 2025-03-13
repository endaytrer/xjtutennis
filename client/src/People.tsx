import { useState } from "react";

function TennisCourt(props: {scale: number, linewidth: number, outerColor: string, innerColor: string, courtNumber: number}) {
    const upperText = `Court ${props.courtNumber}`;
    const lowerText = "XJTUTENNIS";
    return <div className="flex flex-col items-center justify-center" style={{width: 120 * props.scale, height: 240 * props.scale, backgroundColor: props.outerColor}}>
        <div className="font-semibold text-white select-none" style={{fontSize: `${props.scale * 4}pt`, marginBottom: props.scale}}>&nbsp;{upperText}&nbsp;</div>
        <div className="relative border-white box-border flex items-center justify-center" style={{ borderWidth: props.linewidth, width: 72 * props.scale, height: 156 * props.scale, backgroundColor: props.innerColor }}>
            <div className="absolute border-white box-border flex flex-col items-center justify-between" style={{ borderWidth: props.linewidth, width: 54 * props.scale, height: 156 * props.scale }}>
                <div className="bg-white" style={{width: props.linewidth, height: 2 * props.scale}}></div>
                <div className="bg-white" style={{width: props.linewidth, height: 2 * props.scale}}></div>
            </div>
            <div className="absolute bg-white" style={{width: 72 * props.scale, height: props.linewidth}}></div>
            <div className="absolute bg-white" style={{width: props.linewidth, height: 84 * props.scale}}></div>
            <div className="absolute border-white box-border" style={{ borderWidth: props.linewidth, width: 54 * props.scale, height: 84 * props.scale}}></div>
            <div className="absolute bg-gray-300 flex items-center justify-between" style={{width: 84 * props.scale, height: props.linewidth / 2}}>
            <div className="absolute flex items-center justify-between" style={{width: 84 * props.scale, height: Math.floor(props.scale / 2)}}></div>
                <div className="rounded-full bg-gray-500 -ml-0.5" style={{width: props.scale * 2, height: props.scale * 2}}></div>
                <div className="rounded-full bg-gray-500 -mr-0.5" style={{width: props.scale * 2, height: props.scale * 2}}></div>
            </div>
        </div>
        <div className="font-semibold text-white select-none" style={{fontSize: `${props.scale * 4}pt`, marginTop: props.scale}}>&nbsp;{lowerText}&nbsp;</div>
    </div>
}

type TennisCourtSite = (props: {scale: number, linewidth: number}) => JSX.Element;

function ZoomableViewer(props: {children: JSX.Element}) {
    const [minZoom, maxZoom] = [-2, 2];
    const scaleFactor = 0.0625;
    const [scale, setScale] = useState(0);
    const [translation, setTranslation] = useState<[number, number]>([0, 0]);
    const [dragging, setDragging] = useState<boolean>(false);
    const [moved, setMoved] = useState<boolean>(false);
    const [focus, setFocus] = useState<boolean>(false);
    // use 2-based log for simple
    const expScale = Math.pow(2, scale)
    return <div className="relative w-full h-fit flex items-center justify-center overflow-hidden bg-zinc-200 dark:bg-zinc-900 rounded-md p-4 border-4 border-solid" style={{cursor: dragging ? "grabbing" : "default", borderColor: focus ? "rgba(59, 130, 246, 0.5)" : "transparent", transition: "border-color 200ms ease-out"}} onWheel={(e) => {
        if (!focus) return;
        const {left, top, width, height}  = (e.currentTarget as HTMLDivElement).getBoundingClientRect()
        const [dx, dy] = [e.clientX - left - width / 2, e.clientY - top - height / 2]

        let signed_scaleFactor = 0;
        if (e.deltaY < 0) {
            if (scale < maxZoom) {
                signed_scaleFactor = scaleFactor
            }
        } else {
            if (scale > minZoom) {
                signed_scaleFactor = -scaleFactor
            }
        }
        // the derivative of expScale is expScale
        const [delta_x, delta_y] = [(translation[0] - dx) * (Math.pow(2, signed_scaleFactor) - 1), (translation[1] - dy) * (Math.pow(2, signed_scaleFactor) - 1)]
        setScale((oldScale) => oldScale + signed_scaleFactor)
        setTranslation((oldTranslation) => [oldTranslation[0] + delta_x, oldTranslation[1] + delta_y])
        setMoved(true)
    }}
    onMouseEnter={() => {
    }}

    onMouseLeave={() => {
        setFocus(false);
        document.body.classList.remove("no-scroll");
    }}
    onMouseDown={() => {
        setFocus(true);
        setDragging(true);
        document.body.classList.add("no-scroll");
    }}

    onMouseUp={() => setDragging(false)}
    onMouseMove={(e) => {
        if (dragging === false) return;
        setTranslation((oldTranslation) => [oldTranslation[0] + e.movementX, oldTranslation[1] + e.movementY])
        setMoved(true)
    }}>
        <div style={{ transform: `translate(${translation[0]}px, ${translation[1]}px) scale(${expScale})`, transformOrigin: "50% 50%"}}>{props.children}</div>
        {
            moved && <button className="absolute left-3 top-3 px-3 py-1 rounded-md bg-blue-500 text-white" onClick={() => {
                setMoved(false);
                setFocus(false);
                document.body.classList.remove("no-scroll");
                setScale(0);
                setTranslation([0, 0])
            }}>Reset</button>
        }
    </div>

}
function SiteContainer(props: {cols: number, rows: number, bgColor: string, children: JSX.Element[]}) {
    return <div className="grid w-fit rounded-lg overflow-hidden shadow-lg" style={{backgroundColor: props.bgColor, gridTemplateColumns: `repeat(${props.cols}, 1fr)`, gridTemplateRows: `repeat(${props.rows}, 1fr)`}}>
        {props.children}
    </div>
}
const IHarbourMainTennisCourts: TennisCourtSite = (props: {scale: number, linewidth: number}) => {
    const outerColor = "#D96161";
    const innerColor = "#168B62";
    return <SiteContainer cols={2} rows={3} bgColor={outerColor}>
        <div className="col-start-2">   <TennisCourt courtNumber={4} scale={props.scale} linewidth={props.linewidth} outerColor={outerColor} innerColor={innerColor}/></div>
        <div className="col-start-2">   <TennisCourt courtNumber={3} scale={props.scale} linewidth={props.linewidth} outerColor={outerColor} innerColor={innerColor}/></div>
        <div>                           <TennisCourt courtNumber={1} scale={props.scale} linewidth={props.linewidth} outerColor={outerColor} innerColor={innerColor}/></div>
        <div>                           <TennisCourt courtNumber={2} scale={props.scale} linewidth={props.linewidth} outerColor={outerColor} innerColor={innerColor}/></div>
    </SiteContainer>
}
const XingqingCenterTennisCourts: TennisCourtSite = (props: {scale: number, linewidth: number}) => {
    const outerColor = "#B57A72";
    const innerColor = "#98726E";
    
    return <SiteContainer cols={2} rows={1} bgColor={outerColor}>
        <div><TennisCourt courtNumber={1} scale={props.scale} linewidth={props.linewidth} outerColor={outerColor} innerColor={innerColor}/></div>
        <div><TennisCourt courtNumber={2} scale={props.scale} linewidth={props.linewidth} outerColor={outerColor} innerColor={innerColor}/></div>
    </SiteContainer>
}
const XingqingShelteredTennisCourts: TennisCourtSite = (props: {scale: number, linewidth: number}) => {
    const outerColor = "#0E9C6B";
    const innerColor = "#1368AE";
    
    return <SiteContainer cols={2} rows={1} bgColor={outerColor}>
        <div><TennisCourt courtNumber={1} scale={props.scale} linewidth={props.linewidth} outerColor={outerColor} innerColor={innerColor}/></div>
        <div><TennisCourt courtNumber={2} scale={props.scale} linewidth={props.linewidth} outerColor={outerColor} innerColor={innerColor}/></div>
    </SiteContainer>
}
const XingqingEastTennisCourts: TennisCourtSite = (props: {scale: number, linewidth: number}) => {

    const outerColor = "#0E9C6B";
    const innerColor = "#179368";
    
    return <SiteContainer cols={2} rows={1} bgColor={outerColor}>
        <div><TennisCourt courtNumber={1} scale={props.scale} linewidth={props.linewidth} outerColor={outerColor} innerColor={innerColor}/></div>
        <div><TennisCourt courtNumber={2} scale={props.scale} linewidth={props.linewidth} outerColor={outerColor} innerColor={innerColor}/></div>
    </SiteContainer>
}
const XingqingSoutheastTennisCourts: TennisCourtSite = (props: {scale: number, linewidth: number}) => {

    const outerColor = "#38A680";
    const innerColor = "#48AA88";
    
    return <SiteContainer cols={2} rows={1} bgColor={outerColor}>
        <div><TennisCourt courtNumber={1} scale={props.scale} linewidth={props.linewidth} outerColor={outerColor} innerColor={innerColor}/></div>
        <div><TennisCourt courtNumber={2} scale={props.scale} linewidth={props.linewidth} outerColor={outerColor} innerColor={innerColor}/></div>
    </SiteContainer>
}
const XingqingSouthTennisCourts: TennisCourtSite = (props: {scale: number, linewidth: number}) => {

    const outerColor = "#38A680";
    const innerColor = "#48AA88";
    
    return <SiteContainer cols={4} rows={1} bgColor={outerColor}>
        <div><TennisCourt courtNumber={1} scale={props.scale} linewidth={props.linewidth} outerColor={outerColor} innerColor={innerColor}/></div>
        <div><TennisCourt courtNumber={2} scale={props.scale} linewidth={props.linewidth} outerColor={outerColor} innerColor={innerColor}/></div>
        <div><TennisCourt courtNumber={3} scale={props.scale} linewidth={props.linewidth} outerColor={outerColor} innerColor={innerColor}/></div>
        <div><TennisCourt courtNumber={4} scale={props.scale} linewidth={props.linewidth} outerColor={outerColor} innerColor={innerColor}/></div>
    </SiteContainer>
}

const allTennisCourtSites: {name: string, Element: TennisCourtSite}[] = [
    {
        name: "创新港主楼网球场",
        Element: IHarbourMainTennisCourts
    },
    {
        name: "兴庆校区文体中心网球馆",
        Element: XingqingCenterTennisCourts
    },
    {
        name: "兴庆校区风雨棚网球场",
        Element: XingqingShelteredTennisCourts
    },
    {
        name: "兴庆校区东门网球场",
        Element: XingqingEastTennisCourts
    },
    {
        name: "兴庆校区东南网球场",
        Element: XingqingSoutheastTennisCourts
    },
    {
        name: "兴庆校区南门网球场",
        Element: XingqingSouthTennisCourts
    },

]
function People() {
    return <div className="w-full">

    <h1 className="text-slate-900 dark:text-white text-2xl mt-5 mb-8">Find a partner</h1>
        {
            allTennisCourtSites.map(site => {
                return <div className="w-full" key={site.name}>
                        <h2 className="text-slate-700 dark:text-gray-200 text-xl mb-4">{site.name}</h2>
                        <h3 className="text-slate-500 dark:text-gray-400 uppercase tracking-widest mt-0 mb-2">Court overview</h3>
                        <div className="w-full flex flex-col items-center"><ZoomableViewer>
                            <site.Element scale={2} linewidth={2}></site.Element>
                        </ZoomableViewer></div>
                        <br />
                    </div>
                }
            )
        }
    </div>
}


export default People;