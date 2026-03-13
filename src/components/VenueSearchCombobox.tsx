import { useState, useMemo } from 'react';
import { Check, ChevronsUpDown, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { MOCK_VENUES } from '@/data/mock';

interface VenueSearchComboboxProps {
  value: string;
  onValueChange: (venueId: string) => void;
  placeholder?: string;
}

export function VenueSearchCombobox({ value, onValueChange, placeholder = "Buscar local..." }: VenueSearchComboboxProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const activeVenues = useMemo(() => 
    MOCK_VENUES.filter(v => v.status === 'activo' || v.status === 'pendiente'),
    []
  );

  const filteredVenues = useMemo(() => {
    if (!search.trim()) return activeVenues;
    const searchLower = search.toLowerCase();
    return activeVenues.filter(v => 
      v.name.toLowerCase().includes(searchLower) ||
      v.city.toLowerCase().includes(searchLower) ||
      v.address.toLowerCase().includes(searchLower)
    );
  }, [activeVenues, search]);

  const selectedVenue = MOCK_VENUES.find(v => v.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
        >
          {selectedVenue ? (
            <div className="flex items-center gap-2 truncate">
              <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="truncate">{selectedVenue.name}</span>
              <span className="text-muted-foreground text-xs">({selectedVenue.city})</span>
            </div>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 z-[2100]" align="start">
        <Command shouldFilter={false}>
          <CommandInput 
            placeholder="Escribe para buscar..." 
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandEmpty>
              <div className="py-4 text-center">
                <p className="text-sm text-muted-foreground">No se encontraron locales.</p>
                <p className="text-xs text-muted-foreground mt-1">Prueba con otro nombre o ciudad.</p>
              </div>
            </CommandEmpty>
            <CommandGroup>
              {filteredVenues.map((venue) => (
                <CommandItem
                  key={venue.id}
                  value={venue.id}
                  onSelect={() => {
                    onValueChange(venue.id);
                    setOpen(false);
                    setSearch('');
                  }}
                  className="cursor-pointer"
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === venue.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <div className="flex flex-col">
                    <span className="font-medium">{venue.name}</span>
                    <span className="text-xs text-muted-foreground">{venue.address}, {venue.city}</span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
