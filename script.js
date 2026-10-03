/* ========================= */
/* SUPABASE CONNECTION (PHASE 1) */
/* ========================= */

/*
    Phase 1 only: initialize the Supabase client and
    verify the connection with a harmless read-only
    query. No submission logic is wired up yet, and
    no fake data is written or read for display.

    Replace the two placeholder values below with
    your actual Supabase project URL and publishable
    (anon) key before testing.
*/

const SUPABASE_URL = "https://jlflyufuzrouqclbgrih.supabase.co";

const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_d09fZHNBYY1W-pdgHm1XxQ_vm5xQydg";

const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY
);


/*
    Minimal read-only check: ask for a single "id"
    column from public.orders. This doesn't expose
    any customer data and doesn't care whether any
    rows exist — it only confirms the client can
    actually reach the database and query the table.
*/

async function testSupabaseConnection() {

    const { data, error } = await supabaseClient
        .from("orders")
        .select("id")
        .limit(1);

    if (error) {

        console.error(
            "Supabase connection failed:",
            error
        );

        return;

    }

    console.log(
        "Supabase connection successful.",
        data
    );

}

testSupabaseConnection();


/* ========================= */
/* EXISTING PORTAL LOGIC */
/* ========================= */

let currentStep = 0;

const steps = [
    "welcome",
    "contact",
    "project",
    "contentVisual",
    "additional",
    "estimate",
    "payment"
];

const progressText = document.getElementById("progressText");

const music = document.getElementById("ambientMusic");
const musicToggle = document.getElementById("musicToggle");

let musicEnabled = false;

/*
    True once the person has clicked the
    music toggle themselves. Lets beginPortal()
    know whether it's safe to turn music on
    automatically, or whether they already
    made their own choice.
*/
let musicManuallyToggled = false;


/*
    Prevents double-clicks from firing
    two transitions on top of each other
    mid-animation.
*/
let isTransitioning = false;


/* ========================= */
/* STEP NAVIGATION */
/* ========================= */

function updateProgressText() {

    if (currentStep === 0) {

        progressText.textContent = "Welcome";

    } else {

        progressText.textContent =
            `${String(currentStep).padStart(2, "0")} / 06`;

    }

}


/*
    Soft transition between steps: the current
    step fades/slides out first, then the next
    one fades in — instead of one hard display
    switch.
*/

function goToStep(newIndex) {

    if (isTransitioning) return;

    if (newIndex < 0 || newIndex > steps.length - 1) return;

    isTransitioning = true;

    const oldStep = document.getElementById(steps[currentStep]);
    const newStep = document.getElementById(steps[newIndex]);

    oldStep.classList.remove("active");
    oldStep.classList.add("leaving");

    const finishTransition = () => {

        oldStep.classList.remove("leaving");
        oldStep.removeEventListener("animationend", finishTransition);

        currentStep = newIndex;

        newStep.classList.add("active");

        updateProgressText();

        /*
            Entering the payment step: default to bank
            transfer as the primary method if none is
            selected yet, and surface the confirmation
            panel only after the customer has also chosen
            a deposit / full amount.
        */
        if (steps[newIndex] === "payment") {
            if (!selectedPaymentMethod) {
                selectPaymentMethod("Transfer");
            } else if (selectedPaymentAmount) {
                showPaymentConfirmation();
            }
        }

        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });

        isTransitioning = false;

    };

    oldStep.addEventListener("animationend", finishTransition);

}


function nextStep() {

    if (currentStep >= steps.length - 1) return;

    if (!validateStep(steps[currentStep])) return;

    goToStep(currentStep + 1);

}


function previousStep() {

    /*
        Don't allow the Portal to go
        back before Section 01.
    */

    if (currentStep <= 1) return;

    goToStep(currentStep - 1);

}


/* ========================= */
/* REQUIRED FIELD VALIDATION */
/* ========================= */

const requiredFieldsByStep = {

    contact: [
        { type: "text", id: "fullName", label: "your full name" },
        { type: "text", id: "socialMedia", label: "your social media" }
    ],

    project: [
        { type: "radio", name: "websiteType", groupId: "websiteTypeOptions", label: "the type of website" }
    ],

    estimate: [
        { type: "radio", name: "priority", groupId: "priorityOptions", label: "how we should handle your project" }
    ]

};


function validateStep(stepId) {

    const fields = requiredFieldsByStep[stepId];

    if (!fields) return true;

    let isValid = true;
    let firstInvalid = null;

    fields.forEach(field => {

        if (field.type === "radio") {

            const checked = document.querySelector(
                `input[name="${field.name}"]:checked`
            );

            const group = document.getElementById(field.groupId);

            if (!checked) {

                isValid = false;

                if (group) group.classList.add("field-error-group");

                if (!firstInvalid) firstInvalid = group;

            } else if (group) {

                group.classList.remove("field-error-group");

            }

            return;

        }

        const input = document.getElementById(field.id);
        const value = input.value.trim();

        if (!value) {

            isValid = false;

            input.classList.add("field-error");

            if (!firstInvalid) firstInvalid = input;

        } else {

            input.classList.remove("field-error");

        }

    });

    if (firstInvalid) {

        firstInvalid.scrollIntoView({
            behavior: "smooth",
            block: "center"
        });

        if (typeof firstInvalid.focus === "function") {
            firstInvalid.focus();
        }

    }

    return isValid;

}


/*
    Clear a text field's error the moment someone
    starts fixing it, and clear a radio group's
    error the moment any option in it is picked.
*/

document
    .querySelectorAll("input, textarea")
    .forEach(field => {

        field.addEventListener("input", () => {
            field.classList.remove("field-error");
        });

        if (field.type === "radio" || field.type === "checkbox") {

            field.addEventListener("change", () => {

                const group = field.closest(".options");

                if (group) group.classList.remove("field-error-group");

            });

        }

    });


/* ========================= */
/* MUSIC */
/* ========================= */

function fadeInMusic() {

    music.volume = 0;

    music.play()
        .then(() => {

            let volume = 0;

            const fade = setInterval(() => {

                volume += 0.02;

                music.volume = Math.min(volume, 0.35);

                if (volume >= 0.35) {
                    clearInterval(fade);
                }

            }, 100);

        })
        .catch(() => {

            /*
                Browser blocked playback.
                User can press the music button.
            */

            musicEnabled = false;

            updateMusicButton();

        });

}


function fadeOutMusic() {

    const fade = setInterval(() => {

        music.volume -= 0.03;

        if (music.volume <= 0) {

            music.volume = 0;

            music.pause();

            clearInterval(fade);

        }

    }, 60);

}


function updateMusicButton() {

    if (musicEnabled) {

        musicToggle.textContent = "♫ On";

        musicToggle.classList.add("music-on");

    } else {

        musicToggle.textContent = "♫ Off";

        musicToggle.classList.remove("music-on");

    }

}


musicToggle.addEventListener("click", () => {

    musicManuallyToggled = true;

    if (musicEnabled) {

        musicEnabled = false;

        fadeOutMusic();

    } else {

        musicEnabled = true;

        fadeInMusic();

    }

    updateMusicButton();

});


/*
    Begin button is the person's first real
    interaction with the page, so it's the
    right moment to softly start the ambient
    music — unless they already made their
    own choice with the toggle first.
*/

function beginPortal() {

    nextStep();

    if (!musicManuallyToggled) {

        musicEnabled = true;

        fadeInMusic();

        updateMusicButton();

    }

}


/* ========================= */
/* REVEAL / HIDE HELPERS */
/* ========================= */

/*
    Used for every conditional field, custom-request
    box, reference-upload block, and the Custom
    dropdown. Reveals play the element's own "show"
    animation; hides play a shared fade-out ("hiding")
    before the element is actually removed from flow,
    so closing feels as soft as opening.
*/

function revealBlock(el) {

    if (!el) return;

    el.classList.remove("hiding");
    el.classList.add("show");

}


function hideBlock(el) {

    if (!el) return;

    if (!el.classList.contains("show")) return;

    el.classList.remove("show");
    el.classList.add("hiding");

    const finishHide = () => {

        el.classList.remove("hiding");
        el.removeEventListener("animationend", finishHide);

    };

    el.addEventListener("animationend", finishHide);

}


/* ========================= */
/* SOCIAL MEDIA PLATFORM */
/* ========================= */

const socialPlatformInputs =
    document.querySelectorAll(
        'input[name="socialPlatform"]'
    );

const socialMediaInput =
    document.getElementById("socialMedia");

const SOCIAL_PLACEHOLDERS = {

    Instagram: "@username",

    WhatsApp: "+62 8xx xxxx xxxx",

    TikTok: "@username",

    Other: "@username or profile link"

};


socialPlatformInputs.forEach(input => {

    input.addEventListener("change", () => {

        socialMediaInput.placeholder =
            SOCIAL_PLACEHOLDERS[input.value] || "@username";

    });

});


/* ========================= */
/* CONTENT STATUS */
/* ========================= */

const contentStatusInputs =
    document.querySelectorAll(
        'input[name="contentStatus"]'
    );

const contentDetails =
    document.getElementById("contentDetails");


contentStatusInputs.forEach(input => {

    input.addEventListener("change", () => {

        if (
            input.value === "Everything ready" ||
            input.value === "Some ready"
        ) {

            revealBlock(contentDetails);

        } else {

            hideBlock(contentDetails);

        }

    });

});


/* ========================= */
/* LOGO */
/* ========================= */

const logoInputs =
    document.querySelectorAll(
        'input[name="logoStatus"]'
    );

const logoUploadField =
    document.getElementById("logoUploadField");

const customLogoField =
    document.getElementById("customLogoField");


logoInputs.forEach(input => {

    input.addEventListener("change", () => {

        hideBlock(logoUploadField);
        hideBlock(customLogoField);


        if (input.value === "Yes") {

            revealBlock(logoUploadField);

        }


        if (input.value === "Custom") {

            revealBlock(customLogoField);

        }

    });

});


/* ========================= */
/* IMAGES */
/* ========================= */

const imageInputs =
    document.querySelectorAll(
        'input[name="imageStatus"]'
    );

const imageUploadField =
    document.getElementById("imageUploadField");

const imageUpload =
    document.getElementById("imageUpload");


let imageLimit = 0;


imageInputs.forEach(input => {

    input.addEventListener("change", () => {

        /*
            YES = maximum 7 images
            SOME = maximum 4 images
            NO = no upload
        */

        if (input.value === "Yes") {

            imageLimit = 7;

            revealBlock(imageUploadField);

        }

        else if (input.value === "Some") {

            imageLimit = 4;

            revealBlock(imageUploadField);

        }

        else {

            imageLimit = 0;

            hideBlock(imageUploadField);

            imageUpload.value = "";

        }

    });

});


imageUpload.addEventListener("change", () => {

    if (imageUpload.files.length > imageLimit) {

        alert(
            `You can upload a maximum of ${imageLimit} images.`
        );

        imageUpload.value = "";

    }

});


/* ========================= */
/* CUSTOM VIBE */
/* ========================= */

const customVibeInputs =
    document.querySelectorAll(
        'input[name="customVibe"]'
    );

const customVibeField =
    document.getElementById("customVibeField");


customVibeInputs.forEach(input => {

    input.addEventListener("change", () => {

        if (input.value === "Specific") {

            revealBlock(customVibeField);

        } else {

            hideBlock(customVibeField);

        }

    });

});

/* ========================= */
/* CUSTOM REQUEST DROPDOWN */
/* ========================= */

const customToggle =
    document.getElementById("customToggle");

const customContent =
    document.getElementById("customContent");

const customArrow =
    document.getElementById("customArrow");


customToggle.addEventListener("click", () => {

    const isOpen =
        customContent.classList.contains("show");


    if (isOpen) {

        hideBlock(customContent);

        customToggle.classList.remove("open");

    } else {

        revealBlock(customContent);

        customToggle.classList.add("open");

    }

});


/* ========================= */
/* CUSTOM CATEGORIES */
/* ========================= */

const customCategories = [

    {
        check: "backgroundCheck",
        box: "backgroundBox"
    },

    {
        check: "animationCheck",
        box: "animationBox"
    },

    {
        check: "othersCheck",
        box: "othersBox"
    }

];


customCategories.forEach(category => {

    const checkbox =
        document.getElementById(category.check);

    const box =
        document.getElementById(category.box);


    checkbox.addEventListener("change", () => {

        if (checkbox.checked) {

            revealBlock(box);

        } else {

            hideBlock(box);

        }

        /*
            This call was missing before, which is
            why checking a custom box never actually
            changed the estimated total.
        */
        updateTotalPrice();

    });

});


/* ========================= */
/* REFERENCE HANDLER */
/* ========================= */

function setupReferenceOptions(
    groupName,
    photoId,
    linkId
) {

    const inputs =
        document.querySelectorAll(
            `input[name="${groupName}"]`
        );

    const photo =
        document.getElementById(photoId);

    const link =
        document.getElementById(linkId);


    inputs.forEach(input => {

        input.addEventListener("change", () => {

            hideBlock(photo);
            hideBlock(link);


            if (
                input.value === "Photo" ||
                input.value === "Both"
            ) {

                revealBlock(photo);

            }


            if (
                input.value === "Link" ||
                input.value === "Both"
            ) {

                revealBlock(link);

            }

        });

    });

}


/* Background */

setupReferenceOptions(
    "backgroundReference",
    "backgroundPhoto",
    "backgroundLink"
);


/* Animation */

setupReferenceOptions(
    "animationReference",
    "animationPhoto",
    "animationLink"
);


/* Others */

setupReferenceOptions(
    "othersReference",
    "othersPhoto",
    "othersLink"
);

/* ========================= */
/* PAYMENT CONFIGURATION
   Single source of truth for payment credentials.
   Replace placeholder values before going live.
   ================================================== */

const PAYMENT_CONFIG = {

    /*
        QRIS — commented out until a merchant QR exists.
        Uncomment qrImagePath / qrNote and the QR button
        in index.html to turn it back on.

        QR image path. Place your real QR asset at this
        path (e.g. assets/payment-qr.png) and update
        the string below if the filename differs.
        PLACEHOLDER — replace with your real QR image.

        qrImagePath: "assets/payment-qr-placeholder.svg",

        Optional note shown under the QR image.

        qrNote: "Scan with your banking or e-wallet app.",
    */

    /*
        DANA instructions. Replace with your real
        DANA number / display name before going live.
    */
    dana: {
        displayName: "Mirza Yamadwipa",
        number: "0851-8950-3902",
        note: "Send the exact amount, then return here and confirm."
    },

    /*
        Bank transfer details. Replace with your real
        account before going live.
    */
    bank: {
        bankName: "BCA",
        accountHolder: "Mirza Yamadwipa",
        accountNumber: "2833547569",
        note: "Transfer the exact amount and keep your proof of payment."
    }

};


/* ========================= */
/* PAYMENT SESSION STATE */
/* ========================= */

/*
    Lightweight UI session for the payment step:
      choosing  — method buttons only
      confirming — method chosen, show summary + Continue
      details   — payment instructions revealed
      submitting — order insert in progress
*/

let paymentSessionPhase = "choosing";

let pendingOrderId = null;

let isSubmittingOrder = false;

/* ========================= */
/* FORM HELPERS */
/* ========================= */

function getValue(id) {

    const element =
        document.getElementById(id);


    if (!element) {

        console.warn(`Missing form element: ${id}`);

        return "";

    }


    return (element.value ?? "").trim();

}


function getCheckedValue(name) {

    const input =
        document.querySelector(
            `input[name="${name}"]:checked`
        );


    return input
        ? input.value
        : "";

}

function collectCustomRequest(type) {

    const checkbox =
        document.getElementById(
            `${type}Check`
        );


    if (!checkbox || !checkbox.checked) {

        return null;

    }


    const request =
        getValue(
            `${type}Request`
        );


    const reference =
        getCheckedValue(
            `${type}Reference`
        );


    const imageInput =
        document.getElementById(
            `${type}Image`
        );


    const linkInput =
        document.getElementById(
            `${type}URL`
        );


    return {

        enabled: true,

        price: CUSTOM_PRICES[type],

        request: request,

        reference: reference,

        imageName:
            imageInput &&
            imageInput.files.length > 0
                ? imageInput.files[0].name
                : "",

        link:
            linkInput
                ? linkInput.value.trim()
                : ""

    };

}

/* ========================= */
/* PHASE 2 — ORDER CREATION */
/* ========================= */

async function submitPortal() {

    /*
        Guard against double-clicks / slow networks
        creating two orders from one confirmation.
    */

    if (isSubmittingOrder) {
        return;
    }


    if (!selectedPaymentAmount) {

        alert("Please choose a payment option first.");

        return;

    }


    if (!selectedPaymentMethod) {

        alert("Please choose a payment method first.");

        return;

    }


    if (paymentSessionPhase !== "details") {

        alert("Please continue to payment and complete the transfer first.");

        return;

    }


    isSubmittingOrder = true;
    paymentSessionPhase = "submitting";

    const submitBtn = document.getElementById("submitButton");

    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = "Saving…";
    }


    try {

        const now = new Date();

        const orderId = ensurePendingOrderId();

        const basePrice = BASE_PRICE;
        const customPrice = calculateCustomPrice();
        const totalPrice = basePrice + customPrice;
        const payableAmount = getPayableAmount();


        /*
            Collect optional file names only (no binary
            upload in this phase — files stay client-side
            or are sent later by the customer).
        */
        const logoUploadInput =
            document.getElementById("logoUpload");

        const logoFileName =
            logoUploadInput &&
            logoUploadInput.files &&
            logoUploadInput.files.length > 0
                ? logoUploadInput.files[0].name
                : "";

        const imageUploadInput =
            document.getElementById("imageUpload");

        const imageFileNames =
            imageUploadInput &&
            imageUploadInput.files &&
            imageUploadInput.files.length > 0
                ? Array.from(imageUploadInput.files).map(
                    (file) => file.name
                )
                : [];


        const order = {

            orderId: orderId,

            createdAt: now.toISOString(),


            client: {

                fullName:
                    getValue("fullName"),

                socialPlatform:
                    getCheckedValue("socialPlatform"),

                socialMedia:
                    getValue("socialMedia"),

                email:
                    getValue("email")

            },


            project: {

                businessName:
                    getValue("projectName"),

                websiteType:
                    getCheckedValue("websiteType"),

                goal:
                    getValue("projectGoal")

            },


            content: {

                status:
                    getCheckedValue("contentStatus"),

                details:
                    getValue("contentNotes"),

                visualVibe:
                    getValue("visualVibe"),

                colors:
                    getValue("colors"),

                logoStatus:
                    getCheckedValue("logoStatus"),

                logoFileName:
                    logoFileName,

                customLogo:
                    getValue("customLogoIdea"),

                imageStatus:
                    getCheckedValue("imageStatus"),

                imageFileNames:
                    imageFileNames,

                reference:
                    getValue("reference"),

                customVibe:
                    getCheckedValue("customVibe"),

                customVibeDetails:
                    getValue("customVibeDetails")

            },


            additional: {

                priorities:
                    getValue("priorities"),

                avoid:
                    getValue("avoid")

            },


            custom: {

                background:
                    collectCustomRequest(
                        "background"
                    ),

                animation:
                    collectCustomRequest(
                        "animation"
                    ),

                others:
                    collectCustomRequest(
                        "others"
                    )

            },


            priority:
                selectedPriority,


            pricing: {

                basePrice:
                    basePrice,

                customPrice:
                    customPrice,

                total:
                    totalPrice

            },


            payment: {

                percentage:
                    selectedPaymentAmount,

                method:
                    selectedPaymentMethod,

                amount:
                    payableAmount,

                status:
                    "awaiting_verification"

            }

        };


        console.log("NEW ORDER:", order);
        console.log(JSON.stringify(order, null, 2));


        /*
            Persist the order. Uses the browser-safe
            anon/publishable key only. On failure the
            customer stays on the payment step and can
            retry — no success animation is played.
        */
        /*
            Insert only — do NOT .select() afterward.
            Anon is allowed to INSERT but not SELECT
            other people's orders. Asking for a
            returning row would fail even after a
            successful save.
        */
        const { error } = await supabaseClient
            .from("orders")
            .insert({
                order_id: order.orderId,
                created_at: order.createdAt,

                client: order.client,
                project: order.project,
                content: order.content,
                custom: order.custom,
                additional: order.additional,

                priority: order.priority,

                pricing: order.pricing,
                payment: order.payment
            });


        if (error) {

            console.error(
                "ORDER SAVE FAILED:",
                error
            );

            const detail =
                error.message ||
                error.hint ||
                "Please try again.";

            alert(
                "We couldn't save your order yet. " + detail
            );

            isSubmittingOrder = false;
            paymentSessionPhase = "details";

            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = "I've completed payment";
            }

            return;

        }


        console.log(
            "ORDER SAVED SUCCESSFULLY:",
            order.orderId
        );

        window.currentOrder = order;

        /*
            Consume the pending ID so a retry after a
            successful save cannot reuse it. (On failure
            we keep it so the customer can retry the
            same order id.)
        */
        pendingOrderId = null;


        const delivered = await playCatMessenger(order);

        if (!delivered) {

            showOrderConfirmation(order);

        }

    } catch (err) {

        console.error("ORDER SUBMIT ERROR:", err);

        alert(
            "We couldn't save your order yet. Please try again."
        );

        isSubmittingOrder = false;
        paymentSessionPhase = "details";

        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = "I've completed payment";
        }

    }

}


/*
    CALM WALK — gait-matched travel and smooth pose changes.

    The fox's feet are animated in CSS (see "WALKING" in
    index.html). To make it read as walking rather than sliding,
    the ground speed here is derived from that gait:

        speed = STRIDE_UNITS x (px per svg unit) / --kit-walk-cycle

    and the travel is a steady pace (linear), with only the last
    stretch easing to a stop. Pose changes (standing -> walking
    -> pausing -> settling) freeze the current pose first and
    let the browser ease from it, instead of snapping.
*/
const WALK_STRIDE_UNITS = 20;   /* must match STRIDE in the walking keyframes */
const WALK_PREP_MS = 800;       /* weight-shift before the first step (--kit-prep) */
const WALK_HOLD_MS = 150;       /* loops paused while the pose starts to ease */
const WALK_DECEL_SHARE = 0.15;  /* last 15% of a leg eases to a stop */
const WALK_DECEL_SLOW = 1.8;    /* that stretch takes 1.8x as long as steady pace would */
const WALK_DECEL_EASE = "cubic-bezier(0.3, 0.54, 0.7, 1)"; /* starts at walking speed */

const KIT_PARTS =
    ".kit-body-group, .cat-messenger-head, .kit-tails, .kit-tail, " +
    ".kit-leg, .kit-ear-left, .kit-ear-right, .cat-messenger-eye";
const KIT_PROPS = ["transform", "translate", "rotate", "scale"];
const catPoseTimers = new WeakMap();

function setCatPose(cat, changes, holdMs) {

    const from =
        cat.classList.contains("walking") || cat.classList.contains("delivering")
            ? "walking"
            : cat.classList.contains("sleeping")
                ? "sleeping"
                : "resting";

    const reduced =
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const frozen = [];

    if (!reduced) {
        cat.querySelectorAll(KIT_PARTS).forEach(el => {
            const cs = getComputedStyle(el);
            frozen.push([
                el,
                KIT_PROPS.map(p => cs.getPropertyValue(p))
            ]);
        });
    }

    clearTimeout(catPoseTimers.get(cat));

    (changes.remove || []).forEach(c => cat.classList.remove(c));
    cat.classList.add("transitioning");
    cat.setAttribute("data-from", from);
    (changes.add || []).forEach(c => cat.classList.add(c));

    if (frozen.length) {

        frozen.forEach(([el, values]) => {
            el.style.transition = "none";
            KIT_PROPS.forEach((p, i) => el.style.setProperty(p, values[i]));
        });

        void cat.getBoundingClientRect();

        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                frozen.forEach(([el]) => {
                    el.style.transition = "";
                    KIT_PROPS.forEach(p => el.style.removeProperty(p));
                });
            });
        });
    }

    catPoseTimers.set(cat, setTimeout(() => {
        cat.classList.remove("transitioning");
        catPoseTimers.set(cat, setTimeout(() => {
            cat.removeAttribute("data-from");
        }, 2200));
    }, holdMs));
}

/*
    Pixels per second the fox covers while walking, from the
    gait itself (stride in svg units, scaled to the rendered size).
*/
function walkSpeedPxPerSec(cat) {

    const svg = cat.querySelector(".delivery-cat-svg");

    const unitPx =
        svg && svg.viewBox && svg.viewBox.baseVal.width
            ? svg.getBoundingClientRect().width / svg.viewBox.baseVal.width
            : 1.76;

    const cycleRaw =
        getComputedStyle(cat).getPropertyValue("--kit-walk-cycle").trim();

    let cycleS = parseFloat(cycleRaw) || 1.4;

    if (cycleRaw.endsWith("ms")) {
        cycleS /= 1000;
    }

    /* a brisk gait (longer leg swing) declares its own stride */
    const stride = parseFloat(cat.dataset.stride) || WALK_STRIDE_UNITS;

    return stride * unitPx / cycleS;
}

/* Time one leg of the walk takes, in ms (steady pace + final ease). */
function walkLegMs(scene, cat, fromPct, toPct) {

    const px =
        Math.abs(parseFloat(toPct) - parseFloat(fromPct)) / 100 *
        (scene.clientWidth || 900);

    const speed = walkSpeedPxPerSec(cat);

    return (
        px * (1 - WALK_DECEL_SHARE) / speed +
        px * WALK_DECEL_SHARE / speed * WALK_DECEL_SLOW
    ) * 1000;
}

/*
    Walks the scene from one position to the next at gait speed:
    a steady pace for most of the way, then a short ease-out into
    a stop. The parcel (when it moves) uses the same duration and
    easing, so cat and parcel travel as one.
*/
function walkLeg(scene, cat, from, to, setPositions) {

    const speed = walkSpeedPxPerSec(cat);

    const sceneW = scene.clientWidth || 900;

    const catFrom = parseFloat(from.cat);
    const catTo = parseFloat(to.cat);
    const boxFrom = parseFloat(from.box);
    const boxTo = parseFloat(to.box);

    const distPx = Math.abs(catTo - catFrom) / 100 * sceneW;

    const mainMs = distPx * (1 - WALK_DECEL_SHARE) / speed * 1000;
    const decelMs = distPx * WALK_DECEL_SHARE / speed * WALK_DECEL_SLOW * 1000;

    const mainShare = 1 - WALK_DECEL_SHARE;

    /* stage 1: steady pace */
    scene.style.setProperty("--walk-ease", "linear");
    scene.style.setProperty("--walk-dur", (mainMs / 1000) + "s");

    setPositions(
        (boxFrom + (boxTo - boxFrom) * mainShare) + "%",
        (catFrom + (catTo - catFrom) * mainShare) + "%"
    );

    /* stage 2: final ease to a stop, starting at the same speed */
    setTimeout(() => {
        scene.style.setProperty("--walk-ease", WALK_DECEL_EASE);
        scene.style.setProperty("--walk-dur", (decelMs / 1000) + "s");
        setPositions(to.box, to.cat);
    }, mainMs);

}

/* ========================= */
/* CAT MESSENGER — DELIVERY SCENE */
/* ========================= */

/*
    Plays once, only after the Supabase insert above has
    already succeeded. Never called on failure.

    A small, calm delivery story — not a mascot fading in
    next to a card:

      parcel appears, alone, and waits
      -> pause
      -> cat enters from the left, walking slowly
      -> cat reaches the parcel, brief pause
      -> parcel and cat travel together to the other side
      -> arrival, pause
      -> cat steps aside, the parcel's flaps open
      -> a receipt emerges from the parcel and settles to
         a comfortable, readable size
      -> the cat leaves a small paw mark on it
      -> the cat remains beside the receipt and becomes
         tappable for a tiny reaction

    The receipt is the confirmation, so this function
    resolves(true) once it has settled and does not tear
    the scene down afterward — there's nothing further
    to reveal underneath it.

    All positions are set as percentages on --box-x /
    --cat-x (relative to the scene's own width), so
    nothing is pinned to the viewport or to a fixed
    bottom-of-screen position, and the same logic scales
    down for mobile.
*/

const DELIVERY_POSITIONS = {
    /* used only by the reduced-motion fallback — mailbox is the center */
    catResting: "20%",
    boxDestination: "50%"
};

/* ========================= */
/* DELIVERY RITUAL            */
/* ========================= */

/*
    Walk cadences: seconds per gait cycle.
    Shorter = quicker steps, longer = heavier/slower.
*/
const WALK_CYCLE_ENTRY  = 0.7;   /* cheerful arrival walk            */
const WALK_CYCLE_PUSH   = 0.9;  /* slower, weighted push cadence    */

let deliveryTimers = [];

function clearDeliveryTimers() {
    deliveryTimers.forEach(clearTimeout);
    deliveryTimers = [];
}

function at(ms, fn) {
    deliveryTimers.push(setTimeout(fn, ms));
}

/*
    Compute all x-positions the ritual needs as percentages of
    the scene width. Called once, after the overlay is visible, so
    we can read real rendered widths.

    Layout (left → right):
        [pet]  →  [box]  →  [station slot]
    
    The station is the center mailbox. The parcel waits on the left
    and is pushed into that slot; the receipt then settles there.
*/
function computeDeliveryPositions(scene, cat, box, lane) {

    const sceneW = scene.clientWidth || 880;

    const toP = (px) => (px / sceneW * 100).toFixed(2) + "%";

    /* cat half-width for centering */
    const catW = cat.getBoundingClientRect().width || 100;
    const boxW = box.getBoundingClientRect().width  ||  76;

    /* start: fully off-screen to the left */
    const catStartPx = -(catW / 2 + 16);

    /* station lane left edge, relative to scene.
       The mailbox is centered, so the slot is the scene center. */
    const sceneLeft  = scene.getBoundingClientRect().left;
    const laneRect   = lane ? lane.getBoundingClientRect() : null;
    const laneLeft   = laneRect && laneRect.width
        ? laneRect.left - sceneLeft
        : sceneW * 0.5 - 70;

    /* slot destination: centre of the mailbox */
    const laneW      = laneRect && laneRect.width ? laneRect.width : 140;
    const slotPx     = laneLeft + laneW * 0.5;

    /* box waits on the left so the push ends at the center mailbox */
    const boxWaitPx  = sceneW * 0.30;

    /* cat stops a body-width to the left of the box */
    const catAtBoxPx = boxWaitPx - catW * 0.55;

    /* during the push, cat and box travel together to the slot */
    const boxSlotPx  = slotPx;
    const catPushPx  = catAtBoxPx + (slotPx - boxWaitPx);

    /* after delivery, cat returns to its resting spot (left side) */
    const catRestPx  = catW * 0.5 + 8;

    return {
        catStart:  toP(catStartPx),
        catAtBox:  toP(catAtBoxPx),
        catPushed: toP(catPushPx),
        catRest:   toP(catRestPx),
        boxWait:   toP(boxWaitPx),
        boxSlot:   toP(boxSlotPx)
    };
}

/*
    Builds the receipt's row list from the order,
    skipping anything empty so no "undefined" / "null" /
    blank rows ever appear.
*/

function buildReceiptRows(order) {

    const methodLabel =
        order.payment?.method === "QR"
            ? "QR"
            : order.payment?.method === "Transfer"
                ? "Bank Transfer"
                : (order.payment?.method || "");

    const paymentValue =
        order.payment?.percentage && methodLabel
            ? `${order.payment.percentage}% — ${methodLabel}`
            : "";

    const statusValue =
        order.payment?.status === "awaiting_verification"
            ? "Verification pending"
            : (order.payment?.status || "");

    const candidateRows = [

        { label: "Order", value: order.orderId ? `#${order.orderId}` : "" },
        { label: "Name", value: order.client?.fullName || "" },
        { label: "Project", value: order.project?.businessName || "" },
        { label: "Type", value: order.project?.websiteType || "" },
        { label: "Priority", value: formatPriority(order.priority) },

        {
            label: "Payment",
            value: paymentValue
        },

        {
            label: "Status",
            value: statusValue
        },

        { label: "Submitted", value: formatSubmittedDate(order.createdAt) }

    ];

    return candidateRows.filter((row) => {

        return (
            row.value &&
            row.value !== "—" &&
            row.value !== "undefined" &&
            row.value !== "null"
        );

    });

}

function renderReceiptRows(order) {

    const container =
        document.getElementById("deliveryReceiptRows");

    if (!container) {

        return;

    }

    const rows = buildReceiptRows(order);

    container.innerHTML = "";

    rows.forEach((row) => {

        const rowEl = document.createElement("div");

        rowEl.className = "delivery-receipt-row";

        const labelEl = document.createElement("span");

        labelEl.textContent = row.label;

        const valueEl = document.createElement("strong");

        valueEl.textContent = row.value;

        rowEl.appendChild(labelEl);
        rowEl.appendChild(valueEl);

        container.appendChild(rowEl);

    });

}


/*
    The messenger's name lives in this one constant.
    Renaming the cat later is a single-line change —
    nothing in the markup or CSS needs to be touched.
*/

const CAT_NAME = "Mirana Star-Seal";

function renderSignatureName() {

    const nameField =
        document.getElementById("deliverySignatureName");

    if (nameField) {

        nameField.textContent = CAT_NAME;

    }

}


/*
    A tap reaction on the cat, available once delivery
    has finished. The line stays up. The next tap fades
    it away, then a different line appears and stays.
*/

const CAT_REACTIONS = [
    "Delivered!",
    "All yours.",
    "Safe travels, little order.",
    "Send it, lets wait",
    "Dont forget to check more"
];

let catInteractionReady = false;
let catReactionInProgress = false;
let catLineIndex = -1;
let catLineTimer = null;

function nextCatLine() {

    if (CAT_REACTIONS.length < 2) {
        catLineIndex = 0;
        return CAT_REACTIONS[0];
    }

    let next = catLineIndex;

    while (next === catLineIndex) {
        next = Math.floor(Math.random() * CAT_REACTIONS.length);
    }

    catLineIndex = next;
    return CAT_REACTIONS[next];

}

function setupCatInteraction() {

    const cat = document.getElementById("deliveryCat");
    const bubble = document.getElementById("deliveryCatBubble");

    if (!cat || cat.dataset.interactionBound === "true") {

        return;

    }

    cat.dataset.interactionBound = "true";

    function react() {

        if (!catInteractionReady || catReactionInProgress) {

            return;

        }

        catReactionInProgress = true;

        cat.classList.remove("reacting");

        /* restart the animation even on rapid re-taps */
        void cat.offsetWidth;

        cat.classList.add("reacting");

        if (bubble) {

            const showLine = () => {
                bubble.textContent = nextCatLine();
                bubble.classList.add("visible");
            };

            clearTimeout(catLineTimer);

            /*
                Already talking: fade the current line out,
                then bring in a different one. A fresh tap
                just leaves the new line up.
            */
            if (bubble.classList.contains("visible")) {

                bubble.classList.remove("visible");
                catLineTimer = setTimeout(showLine, 280);

            } else {

                showLine();

            }

        }

        setTimeout(() => {

            cat.classList.remove("reacting");
            catReactionInProgress = false;

        }, 700);

    }

    cat.addEventListener("click", react);

    cat.addEventListener("keydown", (event) => {

        if (event.key === "Enter" || event.key === " ") {

            event.preventDefault();

            react();

        }

    });

}


function playCatMessenger(order) {

    return new Promise((resolve) => {

        const overlay  = document.getElementById("catMessenger");
        const scene    = document.getElementById("deliveryScene");
        const box      = document.getElementById("deliveryBox");
        const cat      = document.getElementById("deliveryCat");
        const receipt  = document.getElementById("deliveryReceipt");
        const pawMark  = document.getElementById("deliveryPawMark");
        const pillow   = document.getElementById("deliveryPillow");
        const lane     = document.getElementById("deliveryLane");
        const station  = document.getElementById("celestialStation");
        const emblem   = document.getElementById("celestial-emblem");

        if (!overlay || !scene || !box || !cat || !receipt) {
            resolve(false);
            return;
        }

        renderReceiptRows(order);
        renderSignatureName();
        setupCatInteraction();

        cat.classList.remove(
            "walking", "delivering", "pushing", "standing", "nudge", "stretch",
            "happy", "brisk", "cheer", "resting", "sleeping", "parked",
            "vanishing", "vanished", "reforming", "reacting"
        );
        receipt.classList.remove("emerging", "settled");
        box.classList.remove("open", "delivered");
        if (pillow) pillow.classList.remove("visible");
        if (pawMark) pawMark.classList.remove("stamped");

        const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

        /* Helper: set both CSS custom props that drive positions */
        function setPos(boxX, catX) {
            scene.style.setProperty("--box-x", boxX);
            scene.style.setProperty("--cat-x", catX);
        }

        document.body.style.overflow = "hidden";
        overlay.classList.add("active");
        overlay.classList.add("ritual");   /* enables station lane + ritual CSS during animation */

        function done() {
            catInteractionReady = true;
            resolve(true);
        }

        /* ── REDUCED MOTION ──────────────────────────────────── */
        if (reduced) {
            overlay.classList.add("reduced");
            setPos(DELIVERY_POSITIONS.boxDestination, DELIVERY_POSITIONS.catResting);
            box.classList.add("open", "delivered");
            cat.classList.add("resting", "sleeping");
            if (pillow) pillow.classList.add("visible");
            receipt.classList.add("emerging", "settled");
            if (pawMark) pawMark.classList.add("stamped");
            setTimeout(done, 500);
            return;
        }

        /* ── COMPUTE POSITIONS ───────────────────────────────── */
        /*
            We need the overlay visible before measuring, so we defer
            one frame to let the browser paint the active state.
        */
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {

                clearDeliveryTimers();

                const g = computeDeliveryPositions(scene, cat, box, lane);

                /* Snap cat off-screen without transitioning */
                cat.style.transition = "none";
                setPos(g.boxWait, g.catStart);
                void cat.offsetWidth;
                cat.style.transition = "";
                cat.classList.add("standing");

                const stepOff = WALK_HOLD_MS + WALK_PREP_MS;

                /* Helpers: get walk duration at a given cycle */
                const legDur = (cycle, from, to) => {
                    cat.style.setProperty("--kit-walk-cycle", cycle + "s");
                    return walkLegMs(scene, cat, from, to);
                };

                let t = 1000;   /* running timestamp, ms from now */

                /* ── SCENE 1: ARRIVAL ────────────────────────────────
                   Pet enters from outside the left edge, cheerful pace.
                   brisk = wider leg swing. cheer = body bounce per step.
                   happy = head shake + ear/tail extra sway during walk.
                   Walking CSS provides body-bob, head-sway, ear/tail follow.
                ─────────────────────────────────────────────────────── */
                at(t, () => {
                    cat.style.setProperty("--kit-walk-cycle", WALK_CYCLE_ENTRY + "s");
                    cat.classList.add("brisk", "cheer", "happy");
                    setCatPose(cat, { add: ["walking"], remove: ["standing"] }, WALK_HOLD_MS);
                });

                t += stepOff;

                const entryMs = legDur(WALK_CYCLE_ENTRY, g.catStart, g.catAtBox);

                at(t, () => {
                    walkLeg(
                        scene, cat,
                        { box: g.boxWait, cat: g.catStart },
                        { box: g.boxWait, cat: g.catAtBox },
                        setPos
                    );
                });

                t += entryMs;

                /* ── SCENE 2: APPROACH & ACKNOWLEDGE ─────────────────
                   Settle beside the parcel, pause with a small nudge.
                ─────────────────────────────────────────────────────── */
                at(t, () => {
                    cat.style.removeProperty("--kit-walk-cycle");
                    cat.classList.remove("brisk", "cheer", "happy");
                    setCatPose(cat, { add: ["nudge"], remove: ["walking"] }, 900);
                });

                t += 1400;

                /* ── SCENE 3: STRETCH / PREPARE ──────────────────────
                   `stretch` is applied ON TOP of `nudge` (the existing CSS
                   targets #deliveryCat.nudge.stretch), so the pose
                   overrides key parts of the resting nudge without a full
                   state change. Held ~1.4 s so it reads as preparation.
                ─────────────────────────────────────────────────────── */
                at(t, () => {
                    cat.classList.add("stretch");
                });

                t += 900 + 1400;   /* transition-in + hold */

                /* ── SCENE 4: PUSH ───────────────────────────────────
                   Slower gait = heavier, effortful steps.
                   `pushing` is applied ON TOP of `delivering` (the existing
                   CSS targets #deliveryCat.delivering.pushing) to add the
                   forward lean during the push walk.
                   Cat and box travel TOGETHER via walkLeg — same timing.
                ─────────────────────────────────────────────────────── */
                const pushMs = legDur(WALK_CYCLE_PUSH, g.catAtBox, g.catPushed);

                at(t, () => {
                    cat.style.setProperty("--kit-walk-cycle", WALK_CYCLE_PUSH + "s");
                    setCatPose(
                        cat,
                        { add: ["delivering", "pushing"], remove: ["nudge", "stretch"] },
                        WALK_HOLD_MS
                    );
                });

                t += stepOff;

                at(t, () => {
                    walkLeg(
                        scene, cat,
                        { box: g.boxWait,  cat: g.catAtBox  },
                        { box: g.boxSlot,  cat: g.catPushed },
                        setPos
                    );
                });

                t += pushMs;

                /* ── SCENE 5: STATION RECEIVES PACKAGE ───────────────
                   Cat settles to standing. Station glows, sparks burst.
                   Emblem pulses once as confirmation.
                ─────────────────────────────────────────────────────── */
                at(t, () => {
                    cat.style.removeProperty("--kit-walk-cycle");
                    setCatPose(cat, { add: ["standing"], remove: ["delivering", "pushing"] }, 900);

                    box.classList.add("open");

                    if (station) {
                        station.classList.add("receiving");
                        /* remove after animation so replay works */
                        deliveryTimers.push(
                            setTimeout(() => station.classList.remove("receiving"), 2000)
                        );
                    }
                });

                at(t + 350, () => {
                    if (emblem) {
                        emblem.classList.remove("ce-confirm");
                        void emblem.offsetWidth;   /* force reflow so animation restarts */
                        emblem.classList.add("ce-confirm");
                        deliveryTimers.push(
                            setTimeout(() => emblem.classList.remove("ce-confirm"), 2200)
                        );
                    }
                });

                t += 1000;

                /* ── SCENE 6: HAPPY PAUSE ────────────────────────────
                   Two gentle head-shakes, ears and tails responding.
                   The `.happy` class adds animation loops on top of the
                   standing pose without replacing it.
                ─────────────────────────────────────────────────────── */
                at(t, () => cat.classList.add("happy"));

                t += 1900;   /* 2× 0.9 s + a little margin */

                at(t, () => cat.classList.remove("happy"));

                t += 400;

                /* ── SCENE 7: DUST VANISH ────────────────────────────
                   Pet arrived on the station side. It dissolves into
                   stardust instead of walking back (that walk faced
                   the wrong way and read as a moonwalk). The receipt
                   starts to open while the pet is disappearing.
                ─────────────────────────────────────────────────────── */
                at(t, () => {
                    cat.style.removeProperty("--kit-walk-cycle");
                    cat.classList.remove(
                        "happy", "stretch", "nudge", "brisk",
                        "walking", "delivering", "pushing"
                    );
                    cat.classList.add("vanishing");
                    receipt.classList.add("emerging");
                    box.classList.add("delivered");
                });

                t += 900;

                /* ── SCENE 8: RECEIPT SETTLES, PET REFORMS ON BED ───
                   Layout switches to the settled grid. The pet is
                   already in the mascot slot (same final spot as
                   before), still invisible, then reforms from dust
                   on the pillow beside the receipt.
                ─────────────────────────────────────────────────────── */
                at(t, () => {
                    cat.classList.remove(
                        "vanishing", "standing", "happy",
                        "stretch", "nudge", "brisk"
                    );
                    cat.classList.add("vanished", "parked");
                    receipt.classList.add("settled");
                    overlay.classList.remove("ritual");
                    box.classList.add("stowed");
                    /* stay on the center mailbox — don't slide the parcel away */
                    setPos(g.boxSlot, DELIVERY_POSITIONS.catResting);
                    if (pillow) pillow.classList.add("visible");
                });

                t += 280;

                at(t, () => {
                    cat.classList.remove("vanished", "parked");
                    cat.classList.add("resting", "reforming");
                });

                t += 900;

                at(t, () => {
                    cat.classList.remove("reforming");
                });

                at(t + 200, () => {
                    if (pawMark) pawMark.classList.add("stamped");
                });

                at(t + 1100, () => cat.classList.add("sleeping"));

                at(t + 600, done);

            });
        });

    });

}


/* ========================= */
/* ORDER CONFIRMATION */
/* ========================= */

function showOrderConfirmation(order) {

    document.getElementById(
        "confirmationOrderId"
    ).textContent =
        `#${order.orderId}`;


    document.getElementById(
        "confirmationName"
    ).textContent =
        order.client.fullName || "—";


    document.getElementById(
        "confirmationProject"
    ).textContent =
        order.project.businessName || "—";


    document.getElementById(
        "confirmationType"
    ).textContent =
        order.project.websiteType || "—";


    document.getElementById(
        "confirmationPriority"
    ).textContent =
        formatPriority(
            order.priority
        );


    document.getElementById(
        "confirmationPayment"
    ).textContent =
        `${order.payment.percentage}% — ${order.payment.method}` +
        (order.payment.status === "awaiting_verification"
            ? " (verification pending)"
            : "");


    document.getElementById(
        "confirmationSubmitted"
    ).textContent =
        formatSubmittedDate(
            order.createdAt
        );


    /*
        The confirmation is outside
        our normal six-step flow,
        so reveal it manually.
    */

    document.querySelectorAll(
        ".step"
    ).forEach(step => {

        step.classList.remove("active");

    });


    document.getElementById(
        "confirmation"
    ).classList.add("active");

}

function formatSubmittedDate(isoString) {

    if (!isoString) {

        return "—";

    }


    const parsed = new Date(isoString);

    if (isNaN(parsed.getTime())) {

        return "—";

    }


    return parsed.toLocaleString(
        undefined,
        {
            day: "numeric",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        }
    );

}

function formatPriority(priority) {

    if (priority === "priority") {

        return "Priority";

    }


    if (priority === "normal") {

        return "Normal";

    }


    if (priority === "not_sure") {

        return "Not sure";

    }


    return "—";

}

/* ========================= */
/* PROJECT PRICING */
/* ========================= */

const BASE_PRICE = 400000;


/*
    Single source of truth for custom-request pricing.
    Every custom option is an ADDITIONAL Rp50.000 on top of the
    base price. The price labels beside each option, the cost
    breakdown, the total, and the saved order all read from here.
*/

const CUSTOM_PRICES = {

    background: 50000,

    animation: 50000,

    others: 50000

};


const CUSTOM_ITEMS = [

    {
        checkboxId: "backgroundCheck",
        key: "background",
        label: "Background customization"
    },

    {
        checkboxId: "animationCheck",
        key: "animation",
        label: "Custom animation"
    },

    {
        checkboxId: "othersCheck",
        key: "others",
        label: "Additional request"
    }

];


let selectedPriority = null;

let selectedPaymentAmount = null;

let selectedPaymentMethod = null;


/* ========================= */
/* FORMAT MONEY */
/* ========================= */

function formatRupiah(amount) {

    return new Intl.NumberFormat(
        "id-ID"
    ).format(amount);

}


/* ========================= */
/* CALCULATE CUSTOM PRICE */
/* ========================= */

function calculateCustomPrice() {

    let customPrice = 0;

    CUSTOM_ITEMS.forEach(item => {

        const checkbox =
            document.getElementById(item.checkboxId);

        if (checkbox && checkbox.checked) {

            customPrice += CUSTOM_PRICES[item.key];

        }

    });

    return customPrice;

}


/*
    Renders one line per selected custom item into
    the cost card, so "custom requests" isn't a single
    unexplained lump sum — the person can see exactly
    what they checked and what each one costs.
*/

function renderCustomBreakdown() {

    const breakdown =
        document.getElementById("customBreakdown");

    if (!breakdown) return;

    breakdown.innerHTML = "";

    CUSTOM_ITEMS.forEach(item => {

        const checkbox =
            document.getElementById(item.checkboxId);

        if (!checkbox || !checkbox.checked) return;

        const price = CUSTOM_PRICES[item.key];

        const row = document.createElement("div");
        row.className = "cost-row";

        row.innerHTML = `
            <span>${item.label}</span>
            <strong>Rp ${formatRupiah(price)}</strong>
        `;

        breakdown.appendChild(row);

    });

}


/* ========================= */
/* UPDATE TOTAL */
/* ========================= */

function updateTotalPrice() {

    const customPrice =
        calculateCustomPrice();


    const total =
        BASE_PRICE + customPrice;


    document.getElementById(
        "basePrice"
    ).textContent =
        `Rp ${formatRupiah(BASE_PRICE)}`;


    renderCustomBreakdown();


    document.getElementById(
        "totalPrice"
    ).textContent =
        `Rp ${formatRupiah(total)}`;


    document.getElementById(
        "depositPrice"
    ).textContent =
        `Rp ${formatRupiah(total * 0.5)}`;


    document.getElementById(
        "fullPaymentPrice"
    ).textContent =
        `Rp ${formatRupiah(total)}`;

}


/* ========================= */
/* PRIORITY SELECTION */
/* ========================= */

const priorityInputs =
    document.querySelectorAll(
        'input[name="priority"]'
    );


priorityInputs.forEach(input => {

    input.addEventListener("change", () => {

        selectedPriority = input.value;

        const priorityLabel =
            document.getElementById(
                "selectedPriorityLabel"
            );


        if (selectedPriority === "normal") {

            priorityLabel.textContent = "Normal";

        }

        else if (selectedPriority === "priority") {

            priorityLabel.textContent = "Priority";

        }

        else {

            priorityLabel.textContent = "Not sure";

        }


        updatePaymentRecommendation();

    });

});


/* ========================= */
/* PAYMENT AMOUNT */
/* ========================= */

function selectPaymentAmount(percent) {

    selectedPaymentAmount =
        percent;


    const total =
        BASE_PRICE +
        calculateCustomPrice();


    const paymentInfo =
        document.getElementById(
            "paymentInfo"
        );


    document
        .getElementById("depositOption")
        .classList.remove("selected");


    document
        .getElementById("fullPaymentOption")
        .classList.remove("selected");


    if (percent === 50) {

        document
            .getElementById("depositOption")
            .classList.add("selected");


        paymentInfo.innerHTML = `
            <strong>50% Deposit</strong><br><br>

            You'll pay
            <strong>
                Rp ${formatRupiah(total * 0.5)}
            </strong>
            now.

            <br><br>

            Remaining:
            <strong>
                Rp ${formatRupiah(total * 0.5)}
            </strong>
        `;

    }


    if (percent === 100) {

        document
            .getElementById("fullPaymentOption")
            .classList.add("selected");


        paymentInfo.innerHTML = `
            <strong>100% Full Payment</strong><br><br>

            You'll pay
            <strong>
                Rp ${formatRupiah(total)}
            </strong>
            now.

            <br><br>

            Remaining:
            <strong>
                Rp 0
            </strong>
        `;

    }

    refreshPaymentPanelsIfOpen();

}


/* ========================= */
/* PAYMENT RECOMMENDATION */
/* ========================= */

function updatePaymentRecommendation() {

    const recommendedPercent =
        selectedPriority === "priority" ? 100 : 50;


    document
        .getElementById("depositOption")
        .classList.toggle(
            "is-recommended",
            recommendedPercent === 50
        );


    document
        .getElementById("fullPaymentOption")
        .classList.toggle(
            "is-recommended",
            recommendedPercent === 100
        );


    selectPaymentAmount(recommendedPercent);

}


/* ========================= */
/* PAYMENT METHOD + FLOW */
/* ========================= */

function getPayableAmount() {

    const total =
        BASE_PRICE + calculateCustomPrice();

    if (selectedPaymentAmount === 50) {
        return total * 0.5;
    }

    if (selectedPaymentAmount === 100) {
        return total;
    }

    return total;

}


function formatPaymentMethodLabel(method) {

    if (method === "QR") return "QR Payment";
    if (method === "DANA") return "DANA";
    if (method === "Transfer") return "Bank Transfer";
    return method || "—";

}


function ensurePendingOrderId() {

    if (pendingOrderId) return pendingOrderId;

    const now = new Date();

    const date =
        now.getFullYear().toString() +
        String(now.getMonth() + 1).padStart(2, "0") +
        String(now.getDate()).padStart(2, "0");

    const random =
        Math.floor(1000 + Math.random() * 9000);

    pendingOrderId = `${date}-${random}`;

    return pendingOrderId;

}


function resetPaymentStage() {

    paymentSessionPhase = "choosing";

    const stage = document.getElementById("paymentStage");
    const confirmPanel = document.getElementById("paymentConfirmPanel");
    const detailsPanel = document.getElementById("paymentDetailsPanel");

    if (stage) stage.hidden = true;
    if (confirmPanel) confirmPanel.hidden = true;
    if (detailsPanel) detailsPanel.hidden = true;

    const submitBtn = document.getElementById("submitButton");
    if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = "I've completed payment";
    }

}


function selectPaymentMethod(method) {

    if (isSubmittingOrder) return;

    selectedPaymentMethod = method;

    document
        .querySelectorAll(".payment-method")
        .forEach(button => {
            button.classList.toggle(
                "selected",
                button.dataset.method === method
            );
        });

    /*
        Choosing a method returns to the confirmation
        step. Credentials are never shown until the
        customer explicitly continues. If amount is
        not chosen yet, only mark the method — the
        confirmation panel appears once amount is set.
    */
    paymentSessionPhase = "confirming";

    if (selectedPaymentAmount) {
        showPaymentConfirmation();
    } else {
        resetPaymentStage();
        paymentSessionPhase = "confirming";
    }

}


function showPaymentConfirmation() {

    if (!selectedPaymentAmount || !selectedPaymentMethod) {
        return;
    }

    const orderId = ensurePendingOrderId();
    const amount = getPayableAmount();

    const stage = document.getElementById("paymentStage");
    const confirmPanel = document.getElementById("paymentConfirmPanel");
    const detailsPanel = document.getElementById("paymentDetailsPanel");
    const rows = document.getElementById("paymentConfirmRows");

    if (!stage || !confirmPanel || !rows) return;

    rows.innerHTML = `
        <div class="payment-summary-row">
            <span>Payment method</span>
            <strong>${formatPaymentMethodLabel(selectedPaymentMethod)}</strong>
        </div>
        <div class="payment-summary-row">
            <span>Amount</span>
            <strong>Rp ${formatRupiah(amount)}</strong>
        </div>
        <div class="payment-summary-row">
            <span>Order</span>
            <strong>#${orderId}</strong>
        </div>
    `;

    stage.hidden = false;
    confirmPanel.hidden = false;
    if (detailsPanel) detailsPanel.hidden = true;

    paymentSessionPhase = "confirming";

}


function confirmPaymentMethod() {

    if (!selectedPaymentMethod || !selectedPaymentAmount) {
        alert("Please choose a payment option and method first.");
        return;
    }

    paymentSessionPhase = "details";

    const confirmPanel = document.getElementById("paymentConfirmPanel");
    const detailsPanel = document.getElementById("paymentDetailsPanel");
    const title = document.getElementById("paymentDetailsTitle");
    const body = document.getElementById("paymentDetailsBody");

    if (!detailsPanel || !body) return;

    if (confirmPanel) confirmPanel.hidden = true;
    detailsPanel.hidden = false;

    const orderId = ensurePendingOrderId();
    const amount = getPayableAmount();
    const amountLabel = `Rp ${formatRupiah(amount)}`;

    if (selectedPaymentMethod === "QR") {

        /*
            QRIS details — kept here to turn back on later.
            The QR button is commented out in index.html.

        if (title) title.textContent = "Scan to pay";

        body.innerHTML = `
            <div class="payment-qr-wrap">
                <p class="payment-qr-caption">Scan to pay</p>
                <img
                    class="payment-qr-image"
                    src="${PAYMENT_CONFIG.qrImagePath}"
                    alt="Payment QR code"
                    id="paymentQrImage"
                >
                <p class="field-note">${PAYMENT_CONFIG.qrNote}</p>
            </div>
            <div class="payment-summary-rows">
                <div class="payment-summary-row">
                    <span>Amount</span>
                    <strong>${amountLabel}</strong>
                </div>
                <div class="payment-summary-row">
                    <span>Order</span>
                    <strong>#${orderId}</strong>
                </div>
            </div>
        `;
        */

    } else if (selectedPaymentMethod === "DANA") {

        if (title) title.textContent = "Pay with DANA";

        const d = PAYMENT_CONFIG.dana;

        body.innerHTML = `
            <div class="payment-instruction-block">
                <p>Send the payment to this DANA account:</p>
                <p>
                    Name
                    <span class="payment-copy-value">${d.displayName}</span>
                </p>
                <p>
                    DANA number
                    <span class="payment-copy-value">${d.number}</span>
                </p>
                <p>${d.note}</p>
            </div>
            <div class="payment-summary-rows">
                <div class="payment-summary-row">
                    <span>Amount</span>
                    <strong>${amountLabel}</strong>
                </div>
                <div class="payment-summary-row">
                    <span>Order</span>
                    <strong>#${orderId}</strong>
                </div>
            </div>
        `;

    } else if (selectedPaymentMethod === "Transfer") {

        if (title) title.textContent = "Bank transfer";

        const b = PAYMENT_CONFIG.bank;

        body.innerHTML = `
            <div class="payment-instruction-block">
                <p>
                    Bank
                    <span class="payment-copy-value">${b.bankName}</span>
                </p>
                <p>
                    Account holder
                    <span class="payment-copy-value">${b.accountHolder}</span>
                </p>
                <p>
                    Account number
                    <span class="payment-copy-value">${b.accountNumber}</span>
                </p>
                <p>${b.note}</p>
            </div>
            <div class="payment-summary-rows">
                <div class="payment-summary-row">
                    <span>Amount</span>
                    <strong>${amountLabel}</strong>
                </div>
                <div class="payment-summary-row">
                    <span>Order</span>
                    <strong>#${orderId}</strong>
                </div>
            </div>
        `;

    }

}


/*
    When the customer changes the deposit / full
    payment amount after already opening a method,
    refresh the confirmation or details panel so the
    displayed amount always matches pricing.
*/

function refreshPaymentPanelsIfOpen() {

    if (paymentSessionPhase === "confirming") {
        showPaymentConfirmation();
    } else if (paymentSessionPhase === "details") {
        confirmPaymentMethod();
    }

}


/* ========================= */
/* INITIAL PRICE */
/* ========================= */

updateTotalPrice();

/* ========================= */
/* CUSTOM OPTION PRICE LABELS + EXAMPLE THUMBNAILS */
/* ========================= */

/*
    Price text beside each custom option is filled from
    CUSTOM_PRICES so it can never disagree with the total.
*/

document.querySelectorAll("[data-custom-price]").forEach(el => {

    const key = el.dataset.customPrice;

    if (CUSTOM_PRICES[key] !== undefined) {
        el.textContent = `+Rp${formatRupiah(CUSTOM_PRICES[key])}`;
    }

});

/*
    Tap a thumbnail to enlarge it in place (no modal).
    Tap again to shrink it.
*/

document.querySelectorAll(".custom-example-thumb").forEach(btn => {

    btn.addEventListener("click", () => {

        const enlarged = btn.classList.toggle("enlarged");

        btn.setAttribute("aria-expanded", enlarged ? "true" : "false");

    });

});