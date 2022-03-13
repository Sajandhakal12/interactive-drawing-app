// import Head from "next/head";
// import Image from "next/image";
import { useEffect, useState, useRef, useCallback } from "react";
// import styles from "../styles/Home.module.css";
import * as io from "socket.io-client";
import { ReactSketchCanvas } from "react-sketch-canvas";
import { useRouter } from "next/router";
import react from "react";
let socket;

export default function Home() {
  const router = useRouter();
  const [canvasProps, setCanvasProps] = useState({
    className: "react-sketch-canvas",
    width: "100%",
    height: "500px",
    backgroundImage:
      "https://upload.wikimedia.org/wikipedia/commons/7/70/Graph_paper_scan_1600x1000_%286509259561%29.jpg",
    preserveBackgroundImageAspectRatio: "none",
    strokeWidth: 4,
    eraserWidth: 5,
    strokeColor: "#000000",
    canvasColor: "#FFFFFF",
    style: { borderRight: "1px solid #CCC" },
    exportWithBackgroundImage: true,
    withTimestamp: true,
    allowOnlyPointerType: "all",
  });

  const inputProps = [
    ["width", "text"],
    ["height", "text"],
    ["backgroundImage", "text"],
    ["preserveBackgroundImageAspectRatio", "text"],
    ["strokeWidth", "number"],
    ["eraserWidth", "number"],
  ];

  const canvasRef = useRef();

  const [dataURI, setDataURI] = useState("");
  const [svg, setSVG] = useState("");
  const [paths, setPaths] = useState([]);
  const [lastStroke, setLastStroke] = useState({
    stroke: null,
    isEraser: null,
  });
  // const [pathsToLoad, setPathsToLoad] = useState("");
  const [sketchingTime, setSketchingTime] = useState(0);
  const [exportImageType, setexportImageType] = useState("png");
  const [query, setQuery] = useState(null);
  const [users, setUsers] = useState({});
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [drawingId, setDrawingId] = useState("");

  useEffect(() => {
    if (router.query.name && router.query.drawingId) {
      setQuery(router.query);
      socket?.emit("join-drawing", {
        name: router.query.name,
        drawingId: router.query.drawingId,
        color: router.query.color,
      });
    }
    setLoading(false);

    return () => {
      socket?.emit("leave-drawing");
    };
  }, [query, router.query]);

  const socketInitializer = useCallback(async () => {
    socket = io.connect("http://localhost:4000/");
    socket.on("connect", () => {
      console.log("connected");
    });

    socket.on("update-canvas", (updatedPath) => {
      const newPath = [updatedPath, ...paths];
      canvasRef?.current?.loadPaths(newPath);
      setPaths(newPath);
    });

    socket.on("joined-drawing", ({ drawing, users }) => {
      canvasRef?.current?.loadPaths(drawing);
      setPaths(drawing);
      setUsers(users);
    });

    socket.on("joined-users", ({ users }) => {
      setUsers(users);
    });

    socket.on("left-drawing", (users) => {
      setUsers(users);
    });

    socket.on("update-control", (updatedControl) => {
      switch (updatedControl) {
        case "undo":
          const undo = canvasRef.current?.undo;
          if (undo) {
            undo();
          }
          break;
        case "redo":
          const redo = canvasRef.current?.redo;
          if (redo) {
            redo();
          }
          break;
        case "clear":
          const clearCanvas = canvasRef.current?.clearCanvas;
          if (clearCanvas) {
            clearCanvas();
          }
          break;
        case "reset":
          const resetCanvas = canvasRef.current?.resetCanvas;
          if (resetCanvas) {
            resetCanvas();
          }
          break;
        default:
          break;
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => socketInitializer(), [socketInitializer]);

  const imageExportHandler = async () => {
    const exportImage = canvasRef.current?.exportImage;

    if (exportImage) {
      const exportedDataURI = await exportImage(exportImageType);
      setDataURI(exportedDataURI);
    }
  };

  const svgExportHandler = async () => {
    const exportSvg = canvasRef.current?.exportSvg;

    if (exportSvg) {
      const exportedDataURI = await exportSvg();
      setSVG(exportedDataURI);
    }
  };

  const getSketchingTimeHandler = async () => {
    const getSketchingTime = canvasRef.current?.getSketchingTime;

    try {
      if (getSketchingTime) {
        const currentSketchingTime = await getSketchingTime();
        setSketchingTime(currentSketchingTime);
      }
    } catch {
      setSketchingTime(0);
      console.error("With timestamp is disabled");
    }
  };

  const penHandler = () => {
    const eraseMode = canvasRef.current?.eraseMode;

    if (eraseMode) {
      eraseMode(false);
    }
  };

  const eraserHandler = () => {
    const eraseMode = canvasRef.current?.eraseMode;

    if (eraseMode) {
      eraseMode(true);
    }
  };

  const undoHandler = () => {
    const undo = canvasRef.current?.undo;
    if (undo) {
      undo();
      socket?.emit("input-control", {
        type: "undo",
        drawingId: query.drawingId,
      });
      if (paths.length === 1)
        socket?.emit("update-canvas", {
          drawingId: query.drawingId,
          msg: [],
        });
    }
  };

  const redoHandler = () => {
    const redo = canvasRef.current?.redo;

    if (redo) {
      socket?.emit("input-control", {
        type: "redo",
        drawingId: query.drawingId,
      });
      redo();
    }
  };

  const clearHandler = () => {
    const clearCanvas = canvasRef.current?.clearCanvas;

    if (clearCanvas) {
      socket?.emit("input-control", {
        type: "clear",
        drawingId: query.drawingId,
      });
      socket?.emit("update-canvas", {
        drawingId: query.drawingId,
        msg: [],
      });
      clearCanvas();
    }
  };

  const resetCanvasHandler = () => {
    const resetCanvas = canvasRef.current?.resetCanvas;

    if (resetCanvas) {
      socket?.emit("input-control", {
        type: "reset",
        drawingId: query.drawingId,
      });
      socket?.emit("update-canvas", {
        drawingId: query.drawingId,
        msg: [],
      });
      resetCanvas();
    }
  };

  const createButton = (label, handler, themeColor) => (
    <button
      key={label}
      className={`btn btn-${themeColor} btn-block`}
      type="button"
      onClick={handler}
    >
      {label}
    </button>
  );

  const buttonsWithHandlers = [
    ["Undo", undoHandler, "primary"],
    ["Redo", redoHandler, "primary"],
    ["Clear All", clearHandler, "primary"],
    ["Reset All", resetCanvasHandler, "primary"],
    ["Pen", penHandler, "secondary"],
    ["Eraser", eraserHandler, "secondary"],
    ["Export Image", imageExportHandler, "success"],
    ["Export SVG", svgExportHandler, "success"],
    ["Get Sketching time", getSketchingTimeHandler, "success"],
  ];

  const onChange = (updatedPaths) => {
    if (updatedPaths.length) {
      socket?.emit("update-canvas", {
        drawingId: query.drawingId,
        msg: updatedPaths,
      });
    }
    setPaths(updatedPaths);
  };

  const onSubmit = (e) => {
    e.preventDefault();
    if (name && drawingId) {
      const color = Math.floor(Math.random() * 16777215).toString(16);
      const newQuery = {
        name,
        drawingId,
        color,
      };
      socket.emit("join-drawing", newQuery);
      router.push({
        pathname: "/",
        query: newQuery,
      });
    }
  };

  return !loading ? (
    !query ? (
      <div className="d-flex justify-content-center align-items-center vh-100">
        <div className="bg-info p-3 rounded">
          <form onSubmit={onSubmit}>
            <div className="mb-3">
              <label htmlFor="name" className="form-label">
                Name
              </label>
              <input
                type="text"
                className="form-control"
                id="name"
                placeholder="Enter your name"
                required={true}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="mb-3">
              <label htmlFor="roomId" className="form-label">
                RoomId
              </label>
              <input
                type="text"
                className="form-control"
                id="roomId"
                placeholder="Enter room code"
                required={true}
                value={drawingId}
                onChange={(e) => setDrawingId(e.target.value)}
              />
            </div>
            <div className="d-flex justify-content-end">
              <button type="submit" className="btn btn-primary">
                Join
              </button>
            </div>
          </form>
        </div>
      </div>
    ) : (
      <main className="container-fluid p-5">
        <div className="row">
          <div className="d-flex">
            {Object.values(users).map(({ name, color }) => (
              <span
                key={color}
                className="mx-2"
                style={{
                  backgroundColor: `#${color}1b`,
                  color: `#${color}`,
                  borderRadius: "8px",
                }}
              >
                {console.log(color)}
                {name}
              </span>
            ))}
          </div>
        </div>

        <div className="row">
          <aside className="col-3 border-right">
            <header className="my-5">
              <h3>Controls</h3>
            </header>
            <form>
              {inputProps.map(([fieldName, type]) => (
                <InputField
                  key={fieldName}
                  fieldName={fieldName}
                  type={type}
                  canvasProps={canvasProps}
                  setCanvasProps={setCanvasProps}
                />
              ))}
              <div className="p-2 col-10 d-flex ">
                <div>
                  <label htmlFor="strokeColorInput" className="form-label">
                    strokeColor
                  </label>
                  <input
                    type="color"
                    name="strokeColor"
                    className="form-control form-control-color"
                    id="strokeColorInput"
                    value={canvasProps.strokeColor}
                    title="Choose stroke color"
                    onChange={(e) => {
                      setCanvasProps((prevCanvasProps) => ({
                        ...prevCanvasProps,
                        strokeColor: e.target.value,
                      }));
                    }}
                  ></input>
                </div>
                <div className="mx-4">
                  <label htmlFor="canvasColorInput" className="form-label">
                    canvasColor
                  </label>
                  <input
                    name="canvasColor"
                    type="color"
                    className="form-control form-control-color"
                    id="canvasColorInput"
                    value={canvasProps.canvasColor}
                    title="Choose stroke color"
                    onChange={(e) => {
                      setCanvasProps((prevCanvasProps) => ({
                        ...prevCanvasProps,
                        backgroundImage: "",
                        canvasColor: e.target.value,
                      }));
                    }}
                  ></input>
                </div>
              </div>
              <div className="p-2 col-10">
                <div className="form-check form-switch">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    role="switch"
                    id="switchExportWithBackgroundImage"
                    checked={canvasProps.exportWithBackgroundImage}
                    onChange={(e) => {
                      setCanvasProps((prevCanvasProps) => ({
                        ...prevCanvasProps,
                        exportWithBackgroundImage: e.target.checked,
                      }));
                    }}
                  />
                  <label
                    className="form-check-label"
                    htmlFor="switchExportWithBackgroundImage"
                  >
                    exportWithBackgroundImage
                  </label>
                </div>
              </div>
              <div className="p-2 col-10">
                <div className="form-check form-switch">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    role="switch"
                    id="switchWithTimestamp"
                    checked={canvasProps.withTimestamp}
                    onChange={(e) => {
                      setCanvasProps((prevCanvasProps) => ({
                        ...prevCanvasProps,
                        withTimestamp: e.target.checked,
                      }));
                    }}
                  />
                  <label
                    className="form-check-label"
                    htmlFor="switchWithTimestamp"
                  >
                    withTimestamp
                  </label>
                </div>
              </div>
              <div className="p-2">
                <label className="form-check-label" htmlFor="exportImageType">
                  exportImageType
                </label>
                <div id="exportImageType" className="pt-2">
                  <div className="form-check form-check-inline">
                    <input
                      className="form-check-input"
                      type="radio"
                      name="exportImageType"
                      id="exportImageTypePng"
                      value="png"
                      checked={exportImageType === "png"}
                      onChange={() => {
                        setexportImageType("png");
                      }}
                    />
                    <label
                      className="form-check-label"
                      htmlFor="exportImageTypePng"
                    >
                      png
                    </label>
                  </div>
                  <div className="form-check form-check-inline">
                    <input
                      className="form-check-input"
                      type="radio"
                      name="exportImageType"
                      id="exportImageTypeJPEG"
                      value="touch"
                      checked={exportImageType === "jpeg"}
                      onChange={() => {
                        setexportImageType("jpeg");
                      }}
                    />
                    <label
                      className="form-check-label"
                      htmlFor="exportImageTypeJPEG"
                    >
                      jpeg
                    </label>
                  </div>
                </div>
              </div>
              <div className="p-2">
                <label
                  className="form-check-label"
                  htmlFor="allowOnlyPointerType"
                >
                  allowOnlyPointerType
                </label>
                <div id="allowOnlyPointerType" className="p-2">
                  <div className="form-check form-check-inline">
                    <input
                      className="form-check-input"
                      type="radio"
                      name="allowPointer"
                      id="allowPointerAll"
                      value="all"
                      checked={canvasProps.allowOnlyPointerType === "all"}
                      onChange={() => {
                        setCanvasProps((prevCanvasProps) => ({
                          ...prevCanvasProps,
                          allowOnlyPointerType: "all",
                        }));
                      }}
                    />
                    <label
                      className="form-check-label"
                      htmlFor="allowPointerAll"
                    >
                      all
                    </label>
                  </div>
                  <div className="form-check form-check-inline">
                    <input
                      className="form-check-input"
                      type="radio"
                      name="allowPointer"
                      id="allowPointerTouch"
                      value="touch"
                      checked={canvasProps.allowOnlyPointerType === "touch"}
                      onChange={() => {
                        setCanvasProps((prevCanvasProps) => ({
                          ...prevCanvasProps,
                          allowOnlyPointerType: "touch",
                        }));
                      }}
                    />
                    <label
                      className="form-check-label"
                      htmlFor="allowPointerTouch"
                    >
                      touch
                    </label>
                  </div>
                  <div className="form-check form-check-inline">
                    <input
                      className="form-check-input"
                      type="radio"
                      name="allowPointer"
                      id="allowPointerMouse"
                      value="mouse"
                      checked={canvasProps.allowOnlyPointerType === "mouse"}
                      onChange={() => {
                        setCanvasProps((prevCanvasProps) => ({
                          ...prevCanvasProps,
                          allowOnlyPointerType: "mouse",
                        }));
                      }}
                    />
                    <label
                      className="form-check-label"
                      htmlFor="allowPointerMouse"
                    >
                      mouse
                    </label>
                  </div>
                  <div className="form-check form-check-inline">
                    <input
                      className="form-check-input"
                      type="radio"
                      name="allowPointer"
                      id="allowPointerPen"
                      value="pen"
                      checked={canvasProps.allowOnlyPointerType === "pen"}
                      onChange={() => {
                        setCanvasProps((prevCanvasProps) => ({
                          ...prevCanvasProps,
                          allowOnlyPointerType: "pen",
                        }));
                      }}
                    />
                    <label
                      className="form-check-label"
                      htmlFor="allowPointerPen"
                    >
                      pen
                    </label>
                  </div>
                </div>
              </div>
            </form>
          </aside>
          <section className="col-9">
            <header className="my-5">
              <h3>Canvas</h3>
            </header>
            <section className="row no-gutters canvas-area m-0 p-0">
              <div className="col-9 canvas p-0">
                <ReactSketchCanvas
                  ref={canvasRef}
                  onChange={onChange}
                  onStroke={(stroke, isEraser) => {
                    if (stroke.endTimestamp) {
                      setLastStroke({ stroke, isEraser });
                      socket?.emit("input-canvas", {
                        drawingId: query.drawingId,
                        msg: stroke,
                      });
                    }
                  }}
                  {...canvasProps}
                />
              </div>
              <div className="col-3 panel">
                <div className="d-grid gap-2">
                  {buttonsWithHandlers.map(([label, handler, themeColor]) =>
                    createButton(label, handler, themeColor)
                  )}
                </div>
              </div>
            </section>
          </section>
        </div>
      </main>
    )
  ) : null;
}

function InputField({ fieldName, type = "text", canvasProps, setCanvasProps }) {
  const handleChange = ({ target }) => {
    setCanvasProps((prevCanvasProps) => ({
      ...prevCanvasProps,
      [fieldName]: target.value,
    }));
  };

  const id = "validation" + fieldName;

  return (
    <div className="p-2 col-10">
      <label htmlFor={id} className="form-label">
        {fieldName}
      </label>
      <input
        name={fieldName}
        type={type}
        className="form-control"
        id={id}
        value={canvasProps[fieldName]}
        onChange={handleChange}
        min={1}
        max={30}
      />
    </div>
  );
}
