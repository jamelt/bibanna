<script setup lang="ts">
interface StyleConfig {
  name: string;
  description: string;
  category: "author-date" | "numeric" | "note";
  authorFormat: {
    order: "first-last" | "last-first";
    separator: string;
    lastSeparator: string;
    etAlThreshold: number;
    etAlUseFirst: number;
  };
  titleFormat: {
    case: "sentence" | "title" | "none";
    fontStyle: "normal" | "italic";
    quotes: boolean;
  };
  dateFormat: {
    form: "text" | "numeric";
    parts: ("year" | "month" | "day")[];
    yearSuffix: string;
  };
  publisherFormat: {
    includeLocation: boolean;
    locationFirst: boolean;
  };
  punctuation: {
    titleDelimiter: string;
    groupDelimiter: string;
    finalPunctuation: string;
  };
}

const emit = defineEmits<{
  (e: "save", cslXml: string, config: StyleConfig): void;
  (e: "cancel"): void;
}>();

const config = ref<StyleConfig>({
  name: "",
  description: "",
  category: "author-date",
  authorFormat: {
    order: "last-first",
    separator: ", ",
    lastSeparator: ", & ",
    etAlThreshold: 7,
    etAlUseFirst: 6,
  },
  titleFormat: {
    case: "sentence",
    fontStyle: "italic",
    quotes: false,
  },
  dateFormat: {
    form: "text",
    parts: ["year"],
    yearSuffix: "",
  },
  publisherFormat: {
    includeLocation: true,
    locationFirst: true,
  },
  punctuation: {
    titleDelimiter: ". ",
    groupDelimiter: ". ",
    finalPunctuation: ".",
  },
});

const currentStep = ref(1);
const steps = [
  { id: 1, name: "Basic Info", icon: "i-heroicons-document-text" },
  { id: 2, name: "Authors", icon: "i-heroicons-users" },
  { id: 3, name: "Titles", icon: "i-heroicons-bookmark" },
  { id: 4, name: "Dates", icon: "i-heroicons-calendar" },
  { id: 5, name: "Publisher", icon: "i-heroicons-building-office" },
  { id: 6, name: "Punctuation", icon: "i-heroicons-ellipsis-horizontal" },
];

const previewEntry = {
  title: "The Structure of Scientific Revolutions",
  authors: [{ firstName: "Thomas S.", lastName: "Kuhn" }],
  year: 1962,
  entryType: "book",
  metadata: {
    publisher: "University of Chicago Press",
    publisherLocation: "Chicago",
  },
};

const livePreview = computed(() => {
  const c = config.value;

  let authors = "";
  const authorList = previewEntry.authors;
  if (c.authorFormat.order === "last-first") {
    authors = authorList
      .map((a) => `${a.lastName}, ${a.firstName}`)
      .join(c.authorFormat.separator);
  } else {
    authors = authorList
      .map((a) => `${a.firstName} ${a.lastName}`)
      .join(c.authorFormat.separator);
  }

  let title = previewEntry.title;
  if (c.titleFormat.case === "sentence") {
    title = title.charAt(0).toUpperCase() + title.slice(1).toLowerCase();
  }
  if (c.titleFormat.fontStyle === "italic") {
    title = `<i>${title}</i>`;
  }
  if (c.titleFormat.quotes) {
    title = `"${title}"`;
  }

  const year = `(${previewEntry.year}${c.dateFormat.yearSuffix})`;

  let publisher = "";
  if (
    c.publisherFormat.includeLocation &&
    previewEntry.metadata.publisherLocation
  ) {
    if (c.publisherFormat.locationFirst) {
      publisher = `${previewEntry.metadata.publisherLocation}: ${previewEntry.metadata.publisher}`;
    } else {
      publisher = `${previewEntry.metadata.publisher}, ${previewEntry.metadata.publisherLocation}`;
    }
  } else {
    publisher = previewEntry.metadata.publisher;
  }

  const d = c.punctuation.groupDelimiter;

  return `${authors} ${year}${d}${title}${d}${publisher}${c.punctuation.finalPunctuation}`;
});

function generateCSL(): string {
  const c = config.value;

  const namePartOrder =
    c.authorFormat.order === "last-first"
      ? '<name-part name="family"/><name-part name="given"/>'
      : '<name-part name="given"/><name-part name="family"/>';

  const authorMacro = `
    <macro name="author">
      <names variable="author">
        <name and="symbol" delimiter="${escapeXml(c.authorFormat.separator)}" delimiter-precedes-last="always" et-al-min="${c.authorFormat.etAlThreshold}" et-al-use-first="${c.authorFormat.etAlUseFirst}" name-as-sort-order="first">
          ${namePartOrder}
        </name>
        <et-al font-style="italic"/>
      </names>
    </macro>`;

  const titleFont =
    c.titleFormat.fontStyle === "italic" ? 'font-style="italic"' : "";
  const titleQuotes = c.titleFormat.quotes ? 'quotes="true"' : "";
  const titleCase =
    c.titleFormat.case === "sentence"
      ? 'text-case="sentence"'
      : c.titleFormat.case === "title"
        ? 'text-case="title"'
        : "";

  const titleMacro = `
    <macro name="title">
      <text variable="title" ${titleFont} ${titleQuotes} ${titleCase}/>
    </macro>`;

  const dateMacro = `
    <macro name="issued">
      <date variable="issued" prefix="(" suffix=")">
        <date-part name="year" suffix="${escapeXml(c.dateFormat.yearSuffix)}"/>
      </date>
    </macro>`;

  const publisherMacro = c.publisherFormat.locationFirst
    ? `
    <macro name="publisher">
      <group delimiter=": ">
        <text variable="publisher-place"/>
        <text variable="publisher"/>
      </group>
    </macro>`
    : `
    <macro name="publisher">
      <group delimiter=", ">
        <text variable="publisher"/>
        <text variable="publisher-place"/>
      </group>
    </macro>`;

  const csl = `<?xml version="1.0" encoding="utf-8"?>
<style xmlns="http://purl.org/net/xbiblio/csl" class="${c.category === "note" ? "note" : "in-text"}" version="1.0">
  <info>
    <title>${escapeXml(c.name)}</title>
    <id>custom-${Date.now()}</id>
    <updated>${new Date().toISOString()}</updated>
  </info>
  ${authorMacro}
  ${titleMacro}
  ${dateMacro}
  ${publisherMacro}
  <citation>
    <layout delimiter="; ">
      <group delimiter=" ">
        <names variable="author">
          <name form="short" and="symbol"/>
        </names>
        <date variable="issued">
          <date-part name="year"/>
        </date>
      </group>
    </layout>
  </citation>
  <bibliography>
    <sort>
      <key macro="author"/>
      <key macro="issued"/>
    </sort>
    <layout suffix="${escapeXml(c.punctuation.finalPunctuation)}">
      <group delimiter="${escapeXml(c.punctuation.groupDelimiter)}">
        <group delimiter=" ">
          <text macro="author"/>
          <text macro="issued"/>
        </group>
        <text macro="title"/>
        <text macro="publisher"/>
      </group>
    </layout>
  </bibliography>
</style>`;

  return csl;
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function nextStep() {
  if (currentStep.value < steps.length) {
    currentStep.value++;
  }
}

function prevStep() {
  if (currentStep.value > 1) {
    currentStep.value--;
  }
}

function handleSave() {
  const cslXml = generateCSL();
  emit("save", cslXml, config.value);
}
</script>

<template>
  <div class="space-y-6">
    <!-- Progress steps -->
    <nav class="flex items-center justify-center overflow-x-auto">
      <ol class="flex items-center space-x-2 min-w-0">
        <li
          v-for="step in steps"
          :key="step.id"
          class="flex items-center shrink-0"
        >
          <button
            type="button"
            class="flex items-center justify-center w-8 h-8 rounded-full transition-colors"
            :class="[
              currentStep === step.id
                ? 'bg-primary-500 text-white'
                : currentStep > step.id
                  ? 'bg-primary-100 text-primary-600 dark:bg-primary-900 dark:text-primary-400'
                  : 'bg-gray-100 text-gray-400 dark:bg-gray-800',
            ]"
            :title="step.name"
            @click="currentStep = step.id"
          >
            <UIcon :name="step.icon" class="w-4 h-4" />
          </button>
          <div
            v-if="step.id < steps.length"
            class="w-6 sm:w-8 h-0.5 mx-0.5 sm:mx-1"
            :class="
              currentStep > step.id
                ? 'bg-primary-500'
                : 'bg-gray-200 dark:bg-gray-700'
            "
          />
        </li>
      </ol>
    </nav>

    <!-- Current step label (mobile) -->
    <p
      class="text-center text-sm font-medium text-gray-600 dark:text-gray-400 sm:hidden"
    >
      Step {{ currentStep }}: {{ steps[currentStep - 1]?.name }}
    </p>

    <!-- Step content -->
    <div class="min-h-[300px]">
      <!-- Step 1: Basic Info -->
      <div v-show="currentStep === 1" class="space-y-4">
        <h3 class="text-lg font-medium">Basic Information</h3>
        <UFormField label="Style Name" required>
          <UInput v-model="config.name" placeholder="My Custom Style" />
        </UFormField>
        <UFormField label="Description">
          <UTextarea
            v-model="config.description"
            placeholder="Describe your citation style..."
            :rows="2"
          />
        </UFormField>
        <UFormField label="Style Category">
          <USelectMenu
            v-model="config.category"
            :options="[
              {
                value: 'author-date',
                label: 'Author-Date (e.g., Smith, 2024)',
              },
              { value: 'numeric', label: 'Numeric (e.g., [1])' },
              { value: 'note', label: 'Notes/Footnotes' },
            ]"
            value-attribute="value"
            option-attribute="label"
          />
        </UFormField>
      </div>

      <!-- Step 2: Authors -->
      <div v-show="currentStep === 2" class="space-y-4">
        <h3 class="text-lg font-medium">Author Formatting</h3>
        <UFormField label="Name Order">
          <USelectMenu
            v-model="config.authorFormat.order"
            :options="[
              {
                value: 'last-first',
                label: 'Last, First (e.g., Kuhn, Thomas S.)',
              },
              {
                value: 'first-last',
                label: 'First Last (e.g., Thomas S. Kuhn)',
              },
            ]"
            value-attribute="value"
            option-attribute="label"
          />
        </UFormField>
        <div class="grid grid-cols-2 gap-4">
          <UFormField label="Author Separator">
            <UInput v-model="config.authorFormat.separator" placeholder=", " />
          </UFormField>
          <UFormField label="Last Author Separator">
            <UInput
              v-model="config.authorFormat.lastSeparator"
              placeholder=", & "
            />
          </UFormField>
        </div>
        <div class="grid grid-cols-2 gap-4">
          <UFormField label="Et al. Threshold">
            <UInput
              v-model.number="config.authorFormat.etAlThreshold"
              type="number"
              :min="1"
              :max="20"
            />
          </UFormField>
          <UFormField label="Et al. Show First">
            <UInput
              v-model.number="config.authorFormat.etAlUseFirst"
              type="number"
              :min="1"
              :max="20"
            />
          </UFormField>
        </div>
      </div>

      <!-- Step 3: Titles -->
      <div v-show="currentStep === 3" class="space-y-4">
        <h3 class="text-lg font-medium">Title Formatting</h3>
        <UFormField label="Title Case">
          <USelectMenu
            v-model="config.titleFormat.case"
            :options="[
              { value: 'sentence', label: 'Sentence case' },
              { value: 'title', label: 'Title Case' },
              { value: 'none', label: 'As entered' },
            ]"
            value-attribute="value"
            option-attribute="label"
          />
        </UFormField>
        <UFormField label="Title Font Style">
          <USelectMenu
            v-model="config.titleFormat.fontStyle"
            :options="[
              { value: 'italic', label: 'Italic' },
              { value: 'normal', label: 'Normal' },
            ]"
            value-attribute="value"
            option-attribute="label"
          />
        </UFormField>
        <UFormField>
          <UCheckbox
            v-model="config.titleFormat.quotes"
            label="Wrap title in quotation marks"
          />
        </UFormField>
      </div>

      <!-- Step 4: Dates -->
      <div v-show="currentStep === 4" class="space-y-4">
        <h3 class="text-lg font-medium">Date Formatting</h3>
        <UFormField label="Date Format">
          <USelectMenu
            v-model="config.dateFormat.form"
            :options="[
              { value: 'text', label: 'Text (January 2024)' },
              { value: 'numeric', label: 'Numeric (01/15/2024)' },
            ]"
            value-attribute="value"
            option-attribute="label"
          />
        </UFormField>
        <UFormField label="Year Suffix (for disambiguation)">
          <UInput
            v-model="config.dateFormat.yearSuffix"
            placeholder="a, b, c..."
          />
        </UFormField>
      </div>

      <!-- Step 5: Publisher -->
      <div v-show="currentStep === 5" class="space-y-4">
        <h3 class="text-lg font-medium">Publisher Formatting</h3>
        <UFormField>
          <UCheckbox
            v-model="config.publisherFormat.includeLocation"
            label="Include publication location"
          />
        </UFormField>
        <UFormField v-if="config.publisherFormat.includeLocation" label="Order">
          <USelectMenu
            v-model="config.publisherFormat.locationFirst"
            :options="[
              {
                value: true,
                label: 'Location: Publisher (Chicago: U of Chicago Press)',
              },
              {
                value: false,
                label: 'Publisher, Location (U of Chicago Press, Chicago)',
              },
            ]"
            value-attribute="value"
            option-attribute="label"
          />
        </UFormField>
      </div>

      <!-- Step 6: Punctuation -->
      <div v-show="currentStep === 6" class="space-y-4">
        <h3 class="text-lg font-medium">Punctuation</h3>
        <UFormField label="Group Delimiter">
          <UInput
            v-model="config.punctuation.groupDelimiter"
            placeholder=". "
          />
          <template #hint
            >Separates major groups (author, title, publisher)</template
          >
        </UFormField>
        <UFormField label="Final Punctuation">
          <UInput
            v-model="config.punctuation.finalPunctuation"
            placeholder="."
          />
        </UFormField>
      </div>
    </div>

    <!-- Live Preview -->
    <UCard :ui="{ body: { padding: 'p-4' } }">
      <template #header>
        <span class="text-sm font-medium text-gray-500">Live Preview</span>
      </template>
      <div
        class="text-sm text-gray-700 dark:text-gray-300 font-serif"
        v-html="livePreview"
      />
    </UCard>

    <!-- Navigation buttons -->
    <div class="flex justify-between">
      <UButton
        v-if="currentStep > 1"
        variant="outline"
        color="gray"
        @click="prevStep"
      >
        Previous
      </UButton>
      <div v-else />

      <div class="flex gap-3">
        <UButton variant="outline" color="gray" @click="emit('cancel')">
          Cancel
        </UButton>
        <UButton
          v-if="currentStep < steps.length"
          color="primary"
          @click="nextStep"
        >
          Next
        </UButton>
        <UButton
          v-else
          color="primary"
          :disabled="!config.name"
          @click="handleSave"
        >
          Save Style
        </UButton>
      </div>
    </div>
  </div>
</template>
